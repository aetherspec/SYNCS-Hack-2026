export const tripBackConfig = {
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ?? '',
  geminiModel:
    process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  geminiImageModel:
    process.env.EXPO_PUBLIC_GEMINI_IMAGE_MODEL?.trim() || 'gemini-3.1-flash-image',
  searchRadiusMetres: 500,
  notificationRadiusMetres: 200,
  minimumSearchMovementMetres: 150,
  maximumSearchIntervalMs: 90_000,
  notificationCooldownMs: 120_000,
  routeSampleDistanceMetres: 20,
} as const;
