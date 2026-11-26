// Only navigation and presentation state cross the 3D boundary. Business writes stay in LocalStore.
export const LOBBY_SCENES: string[] = ['meals','recipes','pantry','profile'];
export const LOBBY_ROUTES: string[] = ['today','diary','recipes','pantry','profile','shopping','draw','new-meal','new-food','meal-plan','favorites','stats','stock-history','tools','settings','auth','recipe-search','ai-assistant'];
export class LobbyRequest {
 v: number = 1;
 type: string = '';
 value: string = '';
}
export class LobbySnapshot {
 v: number = 1;
 type: string = 'snapshot';
 scene: string = 'meals';
 reducedMotion: boolean = false;
 quality: string = 'balanced';
 nickname: string = '';
 mealSummaries: string[] = ['', '', ''];
 foodCount: number = 0;
 mealCount: number = 0;
 planCount: number = 0;
 shoppingCount: number = 0;
 favoriteCount: number = 0;
 date: string = '';
}
export function parseLobbyRequest(raw: string): LobbyRequest | null {
 if (typeof raw !== 'string' || raw.length > 512) { return null; }
 try {
  const r: LobbyRequest = JSON.parse(raw) as LobbyRequest;
  if (!r || r.v !== 1 || typeof r.type !== 'string' || typeof r.value !== 'string') { return null; }
  if (r.type === 'ready' && r.value === '') { return r; }
  if (r.type === 'route' && LOBBY_ROUTES.includes(r.value)) { return r; }
  if (r.type === 'scene' && LOBBY_SCENES.includes(r.value)) { return r; }
  if (r.type === 'overlay' && (r.value === 'features' || r.value === 'none')) { return r; }
  if (r.type === 'mode' && (r.value === 'simple' || r.value === '3d')) { return r; }
  return null;
 } catch (_) { return null; }
}
export function lobbyScene(value: string): string { return LOBBY_SCENES.includes(value) ? value : 'meals'; }
export function lobbyQuality(value: string): string { return ['balanced','high','economy'].includes(value) ? value : 'balanced'; }
