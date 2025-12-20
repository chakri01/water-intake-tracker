'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Droplets, ArrowLeft } from 'lucide-react';

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/today-intake');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (intake, goal) => {
    return Math.min((intake / goal) * 100, 100);
  };

  const handleUserClick = (userId) => {
    router.push(`/user/${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Droplets className="w-6 h-6 text-blue-500" />
            Dashboard
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Today's Date */}
        <Card className="mb-6 bg-white/60 backdrop-blur">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-xl font-semibold">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </CardContent>
        </Card>

        {/* Users Progress */}
        <div className="space-y-4">
          {users.map((user) => {
            const percentage = getProgressPercentage(user.todayIntake, user.dailyGoal);
            return (
              <Card 
                key={user._id} 
                className="bg-white hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{user.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {user.todayIntake}ml / {user.dailyGoal}ml
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: user.color
                        }}
                      >
                        {percentage > 0 && (
                          <div className="absolute inset-0 flex items-center justify-end pr-2">
                            <span className="text-xs font-medium text-white">
                              {Math.round(percentage)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleUserClick(user._id)}
                      className="w-full"
                      style={{ backgroundColor: user.color }}
                    >
                      View {user.name}'s Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}