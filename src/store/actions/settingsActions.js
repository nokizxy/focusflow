import { defaultSettings } from '../defaultData';

export function updateSettingsInState(current, patch) {
  return {
    ...current,
    settings: { ...current.settings, ...patch }
  };
}

export function clearDataState() {
  return {
    tasks: [],
    settings: defaultSettings,
    history: []
  };
}
