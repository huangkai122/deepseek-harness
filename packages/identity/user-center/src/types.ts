/** JSON-safe user-center Remote request and response vocabulary. */
export interface UserProfile {
  readonly id: 1
  readonly nickname: string
  readonly avatarUrl?: string
}
export interface UserStatusRequest { readonly sessionToken?: string }
export interface UserStatusValue { readonly needsSetup: boolean; readonly authenticated: boolean; readonly user?: UserProfile }
export interface UserSetupRequest { readonly nickname: string; readonly password: string; readonly avatarUrl?: string }
export interface UserSessionValue { readonly sessionToken: string; readonly user: UserProfile }
export interface UserLoginRequest { readonly password: string }
export interface UserProfileUpdateRequest { readonly sessionToken: string; readonly nickname: string; readonly avatarUrl?: string }
export interface UserPasswordChangeRequest { readonly sessionToken: string; readonly currentPassword: string; readonly newPassword: string }
export interface UserLogoutRequest { readonly sessionToken: string }
export interface UserLogoutValue { readonly loggedOut: true }
