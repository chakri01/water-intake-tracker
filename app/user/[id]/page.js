'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Plus, Settings, Droplets, User } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function UserDetail() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id;

  const [user, setUser] = useState(null);
  const [todayIntake, setTodayIntake] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [viewMode, setViewMode] = useState('7days'); // '7days' or 'month'
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadUserData();
      loadAllUsers();
    }
  }, [userId]);

  useEffect(() => {
    if (user) {
      loadChartData();
    }
  }, [user, viewMode]);

  const loadUserData = async () => {
    try {
      const userRes = await fetch(`/api/users/${userId}`);
      const userData = await userRes.json();
      setUser(userData);
      setNewGoal(userData.dailyGoal.toString());

      // Get today's intake
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const logsRes = await fetch(
        `/api/water-logs?userId=${userId}&startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`
      );
      const logs = await logsRes.json();
      const total = logs.reduce((sum, log) => sum + log.amount, 0);
      setTodayIntake(total);
      setSliderValue(total);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setAllUsers(data);
    } catch (error) {
      console.error('Error loading all users:', error);
    }
  };

  const loadChartData = async () => {
    try {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      
      if (viewMode === '7days') {
        startDate.setDate(startDate.getDate() - 6);
      } else {
        startDate.setDate(1);
      }
      startDate.setHours(0, 0, 0, 0);

      const logsRes = await fetch(
        `/api/water-logs?userId=${userId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const logs = await logsRes.json();

      // Group by date
      const dailyData = {};
      logs.forEach(log => {
        const date = new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyData[date] = (dailyData[date] || 0) + log.amount;
      });

      // Fill in missing dates
      const chartArray = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartArray.push({
          date: dateStr,
          intake: dailyData[dateStr] || 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setChartData(chartArray);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const handleSliderChange = (value) => {
    // Snap to 50ml increments
    const snapped = Math.round(value[0] / 50) * 50;
    setSliderValue(snapped);
  };

  const handleAddWater = async () => {
    if (sliderValue === todayIntake) return;

    const difference = sliderValue - todayIntake;
    if (difference <= 0) return;

    try {
      await fetch('/api/water-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          amount: difference
        })
      });

      setTodayIntake(sliderValue);
      loadChartData();
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  const handleUpdateGoal = async () => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoal: parseInt(newGoal) })
      });

      setUser({ ...user, dailyGoal: parseInt(newGoal) });
      setEditingGoal(false);
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const percentage = Math.min((todayIntake / user.dailyGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4 pb-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <div className="w-20"></div>
        </div>

        {/* Quick User Navigation */}
        <Card className="mb-6 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap mr-2">Quick Switch:</span>
              {allUsers.map((u) => (
                <Button
                  key={u._id}
                  variant={u._id === userId ? "default" : "outline"}
                  size="sm"
                  onClick={() => router.push(`/user/${u._id}`)}
                  style={u._id === userId ? { backgroundColor: u.color } : {}}
                  className="whitespace-nowrap"
                >
                  {u.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Date */}
        <Card className="mb-6 bg-white">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-lg font-semibold">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </CardContent>
        </Card>

        {/* Water Intake Control */}
        <Card className="mb-6 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Water Intake</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingGoal(!editingGoal)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Goal Setting */}
            {editingGoal ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Daily goal (ml)"
                />
                <Button onClick={handleUpdateGoal}>Save</Button>
                <Button variant="outline" onClick={() => setEditingGoal(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: user.color }}>
                  {todayIntake}ml
                </div>
                <div className="text-sm text-muted-foreground">of {user.dailyGoal}ml goal</div>
                <div className="text-lg font-semibold mt-2">{Math.round(percentage)}%</div>
              </div>
            )}

            {/* Slider */}
            <div className="space-y-4">
              <Slider
                value={[sliderValue]}
                onValueChange={handleSliderChange}
                max={user.dailyGoal + 1000}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>0ml</span>
                <span>{sliderValue}ml</span>
                <span>{user.dailyGoal + 1000}ml</span>
              </div>
            </div>

            {/* Add Button */}
            <Button 
              onClick={handleAddWater}
              disabled={sliderValue === todayIntake}
              className="w-full"
              size="lg"
              style={{ backgroundColor: user.color }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {sliderValue - todayIntake > 0 ? `${sliderValue - todayIntake}ml` : 'Water'}
            </Button>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>History</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === '7days' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('7days')}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  This Month
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="intake" fill={user.color} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}