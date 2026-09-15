export function setToken(token: string): void {
  localStorage.setItem('travel_planner_token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('travel_planner_token');
}

export function clearToken(): void {
  localStorage.removeItem('travel_planner_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}