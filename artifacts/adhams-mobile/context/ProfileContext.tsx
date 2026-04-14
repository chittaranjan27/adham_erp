import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface UserProfile {
  initials: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
}

const PROFILES: UserProfile[] = [
  { initials: "SA", name: "Super Admin", email: "admin@adhams.com", role: "super_admin", roleLabel: "Super Admin" },
  { initials: "MG", name: "Murali G", email: "murali@adhams.com", role: "inventory_manager", roleLabel: "Inventory Manager" },
  { initials: "RP", name: "Ravi Patil", email: "ravi@adhams.com", role: "logistics", roleLabel: "Logistics Officer" },
  { initials: "SK", name: "Satheeshan K", email: "satheeshan@adhams.com", role: "warehouse", roleLabel: "Warehouse Staff" },
  { initials: "VP", name: "Vijay P", email: "vijay@adhams.com", role: "sales", roleLabel: "Sales Executive" },
];

interface ProfileContextValue {
  profile: UserProfile;
  profiles: UserProfile[];
  setProfile: (p: UserProfile) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

const STORAGE_KEY = "@adhams_active_profile";

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(PROFILES[0]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as UserProfile;
          const match = PROFILES.find((p) => p.role === parsed.role);
          if (match) setProfileState(match);
        } catch {}
      }
    });
  }, []);

  const setProfile = useCallback((p: UserProfile) => {
    setProfileState(p);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, profiles: PROFILES, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
