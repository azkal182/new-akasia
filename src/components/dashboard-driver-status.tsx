'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserDrivingStatus } from '@/features/cars/actions';
import { DriverStatusCard } from './driver-status-card';

type DrivingStatus = Awaited<ReturnType<typeof getCurrentUserDrivingStatus>>;

export function DashboardDriverStatus() {
  const [drivingStatus, setDrivingStatus] = useState<DrivingStatus>(null);
  const [loading, setLoading] = useState(true);

  async function loadStatus() {
    setLoading(true);
    try {
      const status = await getCurrentUserDrivingStatus();
      setDrivingStatus(status);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) {
    return null;
  }

  if (!drivingStatus) {
    return null;
  }

  return (
    <DriverStatusCard
      drivingStatus={drivingStatus}
      onStatusChange={loadStatus}
    />
  );
}
