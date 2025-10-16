import React from 'react';
import { ModernCard, CardContent, CardHeader, CardTitle } from '@/components/ui/modern-card';

export default function ChallengesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Challenges</h1>
        <p className="text-on-surface-variant">Complete trading challenges to improve your skills</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModernCard interactive>
            <CardHeader>
              <CardTitle>Discipline Challenge</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant mb-4">Maintain strict trading discipline for 30 days</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-success">Active</span>
                <span className="text-sm text-on-surface-variant">15/30 days</span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-surface-container rounded-full h-2">
                  <div className="bg-success h-2 rounded-full" style={{width: '50%'}}></div>
                </div>
              </div>
            </CardContent>
          </ModernCard>

          <ModernCard interactive>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant mb-4">Keep risk per trade under 2% for 20 trades</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-warning">In Progress</span>
                <span className="text-sm text-on-surface-variant">8/20 trades</span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-surface-container rounded-full h-2">
                  <div className="bg-warning h-2 rounded-full" style={{width: '40%'}}></div>
                </div>
              </div>
            </CardContent>
          </ModernCard>

          <ModernCard interactive>
            <CardHeader>
              <CardTitle>Consistency Challenge</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant mb-4">Trade consistently for 10 consecutive days</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">Not Started</span>
                <span className="text-sm text-on-surface-variant">0/10 days</span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-surface-container rounded-full h-2">
                  <div className="bg-on-surface-variant h-2 rounded-full" style={{width: '0%'}}></div>
                </div>
              </div>
            </CardContent>
          </ModernCard>
      </div>
    </div>
  );
}
