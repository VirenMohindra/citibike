/* eslint-disable react/jsx-no-literals */
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useBreakevenAnalysis, useMonthlyEconomics, useTrips } from '@/lib/db';
import NavBar from '@/components/nav/NavBar';
import BenchmarkingDashboard from '@/components/analysis/BenchmarkingDashboard';

export default function EconomicsPage() {
  const router = useRouter();
  const { citibikeUser } = useAppStore();

  // Get current month and year
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12

  // Fetch data
  const monthlyEconomics = useMonthlyEconomics(
    citibikeUser?.id || null,
    selectedYear,
    selectedMonth
  );
  const breakevenAnalysis = useBreakevenAnalysis(citibikeUser?.id || null);
  const personalTrips = useTrips(citibikeUser?.id || null, {});

  // Get available months from breakeven data
  const availableMonths = useMemo(() => {
    if (!breakevenAnalysis) return [];
    return breakevenAnalysis.monthlyData.map((m) => ({
      label: m.month,
      year: parseInt(m.month.split('-')[0], 10),
      month: parseInt(m.month.split('-')[1], 10),
    }));
  }, [breakevenAnalysis]);

  // Redirect if not logged in
  if (!citibikeUser) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please log in to view your trip economics
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3]"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!monthlyEconomics || !breakevenAnalysis) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading economics data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if trips are normalized
  if (monthlyEconomics.citibikeTrips === 0 && breakevenAnalysis.avgTripsPerMonth === 0) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No trip data found. Please sync your trips first.
            </p>
            <button
              onClick={() => router.push('/trips')}
              className="px-6 py-3 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3]"
            >
              Go to Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />

      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Transportation Economics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Analyze your Citibike usage and compare costs to subway alternatives
            </p>
          </div>

          {/* Month Selector */}
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Month
            </label>
            <select
              value={`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-');
                setSelectedYear(parseInt(year, 10));
                setSelectedMonth(parseInt(month, 10));
              }}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {availableMonths.map((m) => (
                <option key={m.label} value={m.label}>
                  {new Date(m.year, m.month - 1).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Trips */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Trips</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {monthlyEconomics.citibikeTrips}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {monthlyEconomics.classicTrips} classic • {monthlyEconomics.ebikeTrips} e-bike
              </div>
            </div>

            {/* Total Cost */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cost</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                ${monthlyEconomics.totalCitibikeCost.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                ${monthlyEconomics.avgCostPerTrip.toFixed(2)} per trip
              </div>
            </div>

            {/* Savings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Savings vs Subway</div>
              <div
                className={`text-3xl font-bold ${
                  monthlyEconomics.savings >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {monthlyEconomics.savings >= 0 ? '+' : ''}$
                {Math.abs(monthlyEconomics.savings).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {monthlyEconomics.savingsPercent >= 0 ? '+' : ''}
                {monthlyEconomics.savingsPercent.toFixed(1)}% vs optimal subway
              </div>
            </div>

            {/* Net Value */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Net Value</div>
              <div
                className={`text-3xl font-bold ${
                  monthlyEconomics.totalNetValue >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {monthlyEconomics.totalNetValue >= 0 ? '+' : ''}$
                {Math.abs(monthlyEconomics.totalNetValue).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Cost + time + health value
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Citibike Cost Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Citibike Cost Breakdown
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Membership</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ${monthlyEconomics.membershipCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">E-bike Fees</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ${monthlyEconomics.ebikeFees.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Overage Fees</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ${monthlyEconomics.overageFees.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
                  <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Total
                  </span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                    ${monthlyEconomics.totalCitibikeCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Subway Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Subway Alternative Cost
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Pay-per-ride ($2.90)
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ${monthlyEconomics.subwayPayPerRideCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Unlimited ($132)</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ${monthlyEconomics.subwayUnlimitedCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Optimal Choice</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    ${monthlyEconomics.optimalSubwayCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
                  <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Your Savings
                  </span>
                  <span
                    className={`text-base font-bold ${
                      monthlyEconomics.savings >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {monthlyEconomics.savings >= 0 ? '+' : ''}$
                    {Math.abs(monthlyEconomics.savings).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Time & Value Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Usage Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Usage Pattern
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Classic Bikes</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {monthlyEconomics.classicPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${monthlyEconomics.classicPercent}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">E-bikes</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {monthlyEconomics.ebikePercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${monthlyEconomics.ebikePercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-500">Avg classic duration</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {Math.round(monthlyEconomics.avgClassicDuration / 60)} min
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-500">Avg e-bike duration</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {Math.round(monthlyEconomics.avgEbikeDuration / 60)} min
                  </span>
                </div>
              </div>
            </div>

            {/* Time Savings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Time Savings
              </h3>
              <div className="text-center py-4">
                <div
                  className={`text-4xl font-bold mb-2 ${
                    monthlyEconomics.avgTimeSavings >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {monthlyEconomics.avgTimeSavings >= 0 ? '+' : ''}
                  {Math.round(monthlyEconomics.avgTimeSavings)} min
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  average per trip vs subway
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {Math.round(monthlyEconomics.totalTimeSaved)} min
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    total time saved this month
                  </div>
                </div>
              </div>
            </div>

            {/* Value Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Value per Trip
              </h3>
              <div className="text-center py-4">
                <div
                  className={`text-4xl font-bold mb-2 ${
                    monthlyEconomics.avgNetValue >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {monthlyEconomics.avgNetValue >= 0 ? '+' : ''}$
                  {Math.abs(monthlyEconomics.avgNetValue).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  average net value per trip
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Includes cost savings, time value, and health benefits
                </div>
              </div>
            </div>
          </div>

          {/* Breakeven Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Breakeven Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Your Current Usage
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Avg trips/month</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {breakevenAnalysis.avgTripsPerMonth.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">E-bike usage</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {breakevenAnalysis.avgEbikePercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Avg cost/month</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      ${breakevenAnalysis.currentMonthlyCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Breakeven Points
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">vs Pay-per-ride</span>
                    <span
                      className={`font-medium ${
                        breakevenAnalysis.breakevenVsPayPerRide > breakevenAnalysis.avgTripsPerMonth
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {breakevenAnalysis.breakevenVsPayPerRide.toFixed(0)} trips
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">vs Unlimited</span>
                    <span
                      className={`font-medium ${
                        breakevenAnalysis.breakevenVsUnlimited > breakevenAnalysis.avgTripsPerMonth
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {breakevenAnalysis.breakevenVsUnlimited.toFixed(0)} trips
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario Comparison */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Cost Scenarios (per month)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                    All Classic &lt;45min
                  </div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${breakevenAnalysis.scenarios.allClassicUnder45.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">All E-bike</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ${breakevenAnalysis.scenarios.allEbike.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                    Optimal Citibike
                  </div>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    ${breakevenAnalysis.scenarios.optimal.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                    Current Subway
                  </div>
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    ${breakevenAnalysis.scenarios.currentSubway.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benchmarking Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <BenchmarkingDashboard personalTrips={personalTrips || []} userId={citibikeUser.id} />
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/trips')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              ← Back to Trips
            </button>
            <button
              onClick={() => router.push('/analysis/normalize')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Normalize Data
            </button>
            <button
              onClick={() => router.push('/analysis/import')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Import Public Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
