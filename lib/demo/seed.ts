#!/usr/bin/env node
/**
 * Demo Data Generation Script
 * Generates realistic demo user data and saves to JSON file
 *
 * Usage:
 *   npm run seed:demo
 *
 * Output:
 *   lib/demo/data/pregenerated-demo.json
 */

import { subYears } from 'date-fns';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fetchStationData, normalizeTrips } from '@/lib/demo/utils';
import { DemoDataPackage, Persona, Station } from '@/lib/demo/types';
import { dailyCommuterPersona } from '@/lib/demo/personas/daily-commuter';
import { generateUserProfile } from '@/lib/demo/factories/user-profile.factory';
import { generateTrips } from '@/lib/demo/factories/trip.factory';
import { generateBikeAngelProfile } from '@/lib/demo/factories/bike-angel.factory';

/**
 * Main generation function
 */
async function generateDemoData() {
  console.log('🌱 Citibike Demo Data Generation Script\n');
  console.log('='.repeat(50));

  try {
    // Step 1: Fetch NYC station data
    console.log('\n📍 Fetching NYC Citibike station data...');
    const stations = await fetchStationData();
    console.log(`   ✓ Loaded ${stations.length} stations`);

    // Step 2: Get all personas to generate
    const personas: Persona[] = [dailyCommuterPersona];
    console.log(`\n👥 Generating ${personas.length} demo persona(s):\n`);

    // Step 3: Generate data for each persona
    const demoPackages: DemoDataPackage[] = [];
    for (const persona of personas) {
      const demoPackage = await generatePersonaData(persona, stations);
      demoPackages.push(demoPackage);
    }

    // Step 4: Save to JSON file
    console.log('\n💾 Saving demo data to file...');
    const outputDir = join(__dirname, 'data');
    mkdirSync(outputDir, { recursive: true });

    const outputPath = join(outputDir, 'pregenerated-demo.json');
    writeFileSync(
      outputPath,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          personas: demoPackages,
        },
        null,
        2
      )
    );

    console.log(`   ✓ Saved to: ${outputPath}`);
    console.log(`   ✓ File size: ${(writeFileSync.length / 1024).toFixed(2)} KB`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Demo data generation completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  }
}

/**
 * Generate data for a single persona
 */
async function generatePersonaData(
  persona: Persona,
  stations: Station[]
): Promise<DemoDataPackage> {
  console.log(`\n🧑 ${persona.name} (${persona.id})`);
  console.log('   ' + '-'.repeat(45));

  try {
    // Generate user profile
    console.log('   📝 Generating user profile...');
    const profile = generateUserProfile(persona);

    // Generate trips (spanning 1 year up to now)
    const now = new Date();
    const oneYearAgo = subYears(now, 1);
    console.log(`   🚴 Generating trips (${oneYearAgo.toDateString()} → ${now.toDateString()})...`);
    const trips = generateTrips(persona.id, persona.tripPattern, oneYearAgo, now, stations);
    console.log(`   ✓ Generated ${trips.length} trips`);

    // Normalize trips (add economics analysis fields)
    console.log('   💰 Normalizing trip data (economics analysis)...');
    const normalizedTrips = normalizeTrips(trips);
    console.log(`   ✓ Normalized ${normalizedTrips.length} trips`);

    // Generate Bike Angel profile
    console.log('   👼 Generating Bike Angel profile...');
    const bikeAngelProfile = generateBikeAngelProfile(
      persona.id,
      persona.bikeAngel,
      normalizedTrips
    );
    console.log(
      `   ✓ Level: ${bikeAngelProfile.currentLevel}, Points: ${bikeAngelProfile.totalPoints}`
    );

    // Summary
    console.log('\n   📊 Summary:');
    console.log(`      - Profile: ${profile.firstName} ${profile.lastName}`);
    console.log(`      - Trips: ${trips.length}`);
    console.log(
      `      - Date range: ${new Date(trips[0].startTime).toLocaleDateString()} → ${new Date(trips[trips.length - 1].startTime).toLocaleDateString()}`
    );
    console.log(`      - E-bike trips: ${trips.filter((t) => t.bikeType === 'ebike').length}`);
    console.log(`      - Classic trips: ${trips.filter((t) => t.bikeType === 'classic').length}`);
    console.log(
      `      - Bike Angel points: ${trips.reduce((sum, t) => sum + (t.angelPoints || 0), 0)}`
    );

    return {
      profile,
      trips: normalizedTrips,
      bikeAngel: bikeAngelProfile,
    };
  } catch (error) {
    console.error(`   ❌ Failed to generate ${persona.name}:`, error);
    throw error;
  }
}

/**
 * Run generation script
 */
if (require.main === module) {
  generateDemoData().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { generateDemoData };
