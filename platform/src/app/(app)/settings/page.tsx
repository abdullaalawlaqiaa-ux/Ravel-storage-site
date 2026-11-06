import { REQUIRED_SCOPES } from '@/lib/zoho/auth';
import { mapping } from '@/config/mapping';
import { SettingsClient } from '@/components/SettingsClient';

export default function SettingsPage() {
  return <SettingsClient scopes={REQUIRED_SCOPES} fields={mapping.fields} />;
}
