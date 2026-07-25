"use client";
 
import * as React from "react";
import { TiktokFulfillmentModule } from "./TiktokFulfillmentModule";
 
interface MultiChannelSyncModuleProps {
  profile?: any;
  idToken?: string;
}
 
export function MultiChannelSyncModule({ profile, idToken }: MultiChannelSyncModuleProps) {
  return <TiktokFulfillmentModule profile={profile} idToken={idToken} />;
}
