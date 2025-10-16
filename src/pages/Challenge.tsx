import React from 'react';
import { DisciplineChallengeDashboard } from '@/components/DisciplineChallengeDashboard';

export default function ChallengePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Challenge Dashboard</h1>
        <p className="text-on-surface-variant">Track your trading discipline and performance metrics</p>
      </div>

      {/* Discipline Challenge Dashboard with Real Data */}
      <DisciplineChallengeDashboard />
    </div>
  );
}
