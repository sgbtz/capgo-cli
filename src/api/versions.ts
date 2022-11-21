import { SupabaseClient } from '@supabase/supabase-js';
import { program } from 'commander';
import { definitions } from '../bin/types_supabase';
import { formatError } from '../bin/utils';
import { checkVersionNotUsedInChannel } from './channels';
import { checkVersionNotUsedInDeviceOverride } from './devices_override';
import { deleteFromStorage } from './storage';

export const deleteAppVersion = async (supabase: SupabaseClient, appid: string, userId: string, bundle: string) => {
  const { error: delAppSpecVersionError } = await supabase
    .from<definitions['app_versions']>('app_versions')
    .update({
      deleted: true
    })
    .eq('app_id', appid)
    .eq('user_id', userId)
    .eq('name', bundle);
  if (delAppSpecVersionError) {
    program.error(`App ${appid}@${bundle} not found in database '${formatError(delAppSpecVersionError)}'`);
  }
}

export const deleteSpecificVersion = async (supabase: SupabaseClient, appid: string, userId: string, bundle: string) => {
  const versionData = await getVersionData(supabase, appid, userId, bundle);
  await checkVersionNotUsedInChannel(supabase, appid, userId, versionData, bundle);
  await checkVersionNotUsedInDeviceOverride(supabase, appid, versionData, bundle);
  // Delete only a specific version in storage
  await deleteFromStorage(supabase, userId, appid, versionData, bundle);

  await deleteAppVersion(supabase, appid, userId, bundle);
}

export const getActiveAppVersions = async (supabase: SupabaseClient, appid: string, userId: string) => {
  const { data, error: vError } = await supabase
    .from<definitions['app_versions']>('app_versions')
    .select()
    .eq('app_id', appid)
    .eq('user_id', userId)
    .eq('deleted', false);

  if (vError) {
    program.error(`App ${appid} not found in database ${formatError(vError)} `);
  }
  return data;
}

export const getVersionData = async (supabase: SupabaseClient, appid: string, userId: string, bundle: string) => {
  const { data: versionData, error: versionIdError } = await supabase
    .from<definitions['app_versions']>('app_versions')
    .select()
    .eq('app_id', appid)
    .eq('user_id', userId)
    .eq('name', bundle)
    .eq('deleted', false)
    .single();
  if (!versionData || versionIdError) {
    program.error(`Version ${appid}@${bundle} doesn't exist ${formatError(versionIdError)}`);
  }
  return versionData;
}