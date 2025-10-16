import React from 'react';
import { ModernCard, CardContent, CardHeader, CardTitle } from '@/components/ui/modern-card';
import { AccessibleInput } from '@/components/ui/accessible-input';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Settings</h1>
        <p className="text-on-surface-variant">Configure your trading journal preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModernCard>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AccessibleInput
                label="Display Name"
                placeholder="Enter your display name"
                defaultValue="Trader"
              />
              <AccessibleInput
                label="Default Risk %"
                placeholder="2"
                type="number"
                helperText="Default risk percentage per trade"
              />
            </CardContent>
          </ModernCard>

          <ModernCard>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-on-surface">Trade Alerts</span>
                <input type="checkbox" className="w-4 h-4 text-primary" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface">Daily Reports</span>
                <input type="checkbox" className="w-4 h-4 text-primary" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface">Weekly Summary</span>
                <input type="checkbox" className="w-4 h-4 text-primary" />
              </div>
            </CardContent>
          </ModernCard>

          <ModernCard>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant mb-4">Your trading data is encrypted and stored securely.</p>
              <button className="bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                Export Data
              </button>
            </CardContent>
          </ModernCard>

          <ModernCard>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant mb-2">Trading Journal v2.0</p>
              <p className="text-on-surface-variant mb-4">Built with modern UX principles and accessibility in mind.</p>
              <button className="bg-secondary text-on-secondary px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors">
                Learn More
              </button>
            </CardContent>
          </ModernCard>
      </div>
    </div>
  );
}
