// Bike Angel Protobuf Response Parser
// Parses the decoded protobuf response from the Bike Angel API

export interface BikeAngelParsedData {
  totalPoints: number;
  rewards: BikeAngelRewardItem[];
  componentStructure: {
    hasProfileHeader: boolean;
    hasRewardStore: boolean;
    hasStreakComponent: boolean;
    hasLifetimeRewards: boolean;
  };
}

export interface BikeAngelRewardItem {
  id: string;
  pointCost: number;
  quantity?: number;
  maxQuantity?: number;
  addText?: string;
  removeText?: string;
}

/**
 * Parse Bike Angel API response
 * Handles both JSON and protobuf responses
 */
export function parseBikeAngelResponse(responseData: Record<string, unknown>): BikeAngelParsedData {
  const result: BikeAngelParsedData = {
    totalPoints: 0,
    rewards: [],
    componentStructure: {
      hasProfileHeader: false,
      hasRewardStore: false,
      hasStreakComponent: false,
      hasLifetimeRewards: false,
    },
  };

  try {
    // First, try to parse as JSON response with labeled fields
    // Check for canvas_custom_component_map which indicates JSON response
    if (
      responseData.canvas_custom_component_map !== undefined ||
      responseData.totalPoints !== undefined ||
      responseData.total_points !== undefined
    ) {
      return parseJsonResponse(responseData);
    }

    // Fall back to protobuf parsing (field 1 = gzip data)
    // Check for gzip field (field 1)
    const gzipData = responseData['1'] as Record<string, unknown> | undefined;
    if (!gzipData) {
      console.warn('No gzip data found in Bike Angel response');
      return result;
    }

    // Extract screen data (field 1 > 1)
    const screenData = gzipData['1'] as Record<string, unknown> | undefined;
    if (!screenData) {
      console.warn('No screen data found');
      return result;
    }

    // Extract components array (field 2 > 4)
    const componentWrapper = screenData['2'] as Record<string, unknown> | undefined;
    const componentsArray = componentWrapper?.['4'] as Array<Record<string, unknown>> | undefined;

    if (componentsArray && Array.isArray(componentsArray)) {
      // Analyze components
      componentsArray.forEach((component) => {
        const componentData = component['34'] as Record<string, unknown> | undefined;
        if (!componentData) return;

        const componentId = componentData['1'] as string | undefined;
        if (!componentId) return;

        // Check for specific components
        if (componentId.includes('BikeAngelsProfileHeader')) {
          result.componentStructure.hasProfileHeader = true;
        } else if (componentId.includes('BikeAngelsRewardStore')) {
          result.componentStructure.hasRewardStore = true;
        } else if (componentId.includes('BikeAngelsStreak')) {
          result.componentStructure.hasStreakComponent = true;
        } else if (componentId.includes('LifetimeRewards')) {
          result.componentStructure.hasLifetimeRewards = true;
        }
      });
    }

    // Extract reward items (field 3)
    const rewardsArray = gzipData['3'] as Array<Record<string, unknown>> | undefined;

    if (rewardsArray && Array.isArray(rewardsArray)) {
      rewardsArray.forEach((rewardItem) => {
        const rewardId = rewardItem['1'] as string | undefined;
        const rewardData = rewardItem['2'] as Record<string, unknown> | undefined;

        if (!rewardId || !rewardData) return;

        // Extract reward details (field 26)
        const rewardDetails = rewardData['26'] as Record<string, unknown> | undefined;
        if (!rewardDetails) return;

        // Extract reward configuration (field 6 > 58)
        const rewardConfig = rewardDetails['6'] as Record<string, unknown> | undefined;
        const rewardConfigDetails = rewardConfig?.['58'] as Record<string, unknown> | undefined;

        if (rewardConfigDetails) {
          // Extract point cost (field 1 > 2)
          const pointField = rewardConfigDetails['1'] as Record<string, unknown> | undefined;
          const pointCost = pointField?.['2'] as number | undefined;

          // Extract total points available (field 4)
          const totalPointsAvailable = rewardConfigDetails['4'] as number | undefined;

          // Extract quantity info
          const quantity = rewardDetails['1'] as number | undefined;
          const maxQuantity = rewardDetails['2'] as number | undefined;

          if (pointCost !== undefined) {
            result.rewards.push({
              id: rewardId,
              pointCost,
              quantity,
              maxQuantity,
              addText: rewardDetails['4'] as string | undefined,
              removeText: rewardDetails['5'] as string | undefined,
            });

            // Use the total points from the first reward item
            if (totalPointsAvailable !== undefined && result.totalPoints === 0) {
              result.totalPoints = totalPointsAvailable;
            }
          }
        }
      });
    }

    console.log('Parsed Bike Angel data:', result);
  } catch (error) {
    console.error('Error parsing Bike Angel response:', error);
  }

  return result;
}

/**
 * Extract specific metrics from parsed data
 */
export function extractBikeAngelMetrics(data: BikeAngelParsedData) {
  return {
    totalPoints: data.totalPoints,
    rewardCount: data.rewards.length,
    lowestReward: data.rewards.reduce((min, r) => Math.min(min, r.pointCost), Infinity),
    highestReward: data.rewards.reduce((max, r) => Math.max(max, r.pointCost), 0),
    hasEnoughForReward: data.rewards.some((r) => r.pointCost <= data.totalPoints),
  };
}

/**
 * Parse JSON response (when API returns JSON instead of protobuf)
 */
function parseJsonResponse(responseData: Record<string, unknown>): BikeAngelParsedData {
  const result: BikeAngelParsedData = {
    totalPoints: 0,
    rewards: [],
    componentStructure: {
      hasProfileHeader: false,
      hasRewardStore: false,
      hasStreakComponent: false,
      hasLifetimeRewards: false,
    },
  };

  // Extract total points from canvas_custom_component_map
  // Structure: canvas_custom_component_map.quantity_*.stepper.on_value_change.update_bike_angels_store_total_action.current_available_points_total
  const componentMap = responseData.canvas_custom_component_map as
    | Record<string, unknown>
    | undefined;
  if (componentMap) {
    // Get first quantity component to extract points
    const firstComponent = Object.values(componentMap)[0] as Record<string, unknown> | undefined;
    if (firstComponent) {
      const stepper = firstComponent.stepper as Record<string, unknown> | undefined;
      if (stepper) {
        const onChange = stepper.on_value_change as Record<string, unknown> | undefined;
        if (onChange) {
          const action = onChange.update_bike_angels_store_total_action as
            | Record<string, unknown>
            | undefined;
          if (action) {
            result.totalPoints = (action.current_available_points_total as number) || 0;
          }
        }
      }
    }

    // Extract rewards from all quantity components
    for (const [id, component] of Object.entries(componentMap)) {
      const comp = component as Record<string, unknown>;
      const stepper = comp.stepper as Record<string, unknown> | undefined;
      if (stepper) {
        const onChange = stepper.on_value_change as Record<string, unknown> | undefined;
        if (onChange) {
          const action = onChange.update_bike_angels_store_total_action as
            | Record<string, unknown>
            | undefined;
          if (action) {
            const selections = action.quantity_selection_ids as
              | Array<Record<string, unknown>>
              | undefined;
            if (selections && selections.length > 0) {
              const pointCost = (selections[0].per_unit_amount as number) || 0;
              const maxValue = (stepper.max_value as number) || 0;

              result.rewards.push({
                id,
                pointCost,
                quantity: 1,
                maxQuantity: maxValue,
              });
            }
          }
        }
      }
    }
  }

  // Fallback: try direct fields
  if (result.totalPoints === 0) {
    result.totalPoints =
      (responseData.totalPoints as number) ||
      (responseData.total_points as number) ||
      (responseData.points as number) ||
      0;
  }

  console.log('Parsed JSON Bike Angel data:', result);
  return result;
}
