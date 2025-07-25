import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { config } from '@/app/utils/amplifyConfig';

export const { runWithAmplifyServerContext, createAuthRouteHandlers } = createServerRunner({
  config
});