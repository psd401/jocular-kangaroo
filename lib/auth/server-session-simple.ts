import { validateJWT } from "./jwt-validator";

export interface CognitoSession {
  sub: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Gets the current authenticated session without using AWS Amplify adapter
 * This is a drop-in replacement for the original getServerSession
 */
export async function getServerSession(): Promise<CognitoSession | null> {
  try {
    const jwtPayload = await validateJWT();
    
    if (!jwtPayload) {
      return null;
    }

    // Convert JWT payload to session format
    return {
      ...jwtPayload,
      email: jwtPayload.email,
    };
  } catch {
    // Session retrieval failed
    return null;
  }
}