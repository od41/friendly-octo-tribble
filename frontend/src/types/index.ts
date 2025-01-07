export interface Group {
  group_id: string; 
  joined_users: string[];       // Maps to on-chain pool ID
  metadata: {
    name: string;
    description: string;
    created_at: Date;
    signed_up_members?: number;
  };
  rules: {
    min_stake: number;
    max_members: number;
    frequency: 'daily' | 'weekly' | 'monthly';  // tracking frequency
    min_distance: number; // in km
    // min_steps: number;
  };
  status: 'pending' | 'active' | 'completed';
}

export interface Activity {
  id: string;
  timestamp: number;
  distance: number;
  duration: number;
  steps: number;
  groupId: string;
}

export interface User {
  address: string;
  groups: string[];
  activities: Activity[];
}
  