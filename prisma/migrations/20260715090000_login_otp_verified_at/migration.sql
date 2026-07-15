-- Add a per-session "verified" marker to the login OTP challenge so the email-OTP-on-login
-- gate can be fail-closed and created lazily (no longer written from a session hook).
ALTER TABLE "login_otps" ADD COLUMN "verified_at" TIMESTAMP(3);
