-- Durable brute-force controls for the email-OTP-on-login gate: a lifetime send counter and
-- a last-sent timestamp so resend/reissue can't reset the attempt budget or bypass a cooldown.
ALTER TABLE "login_otps" ADD COLUMN "sends" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "login_otps" ADD COLUMN "last_sent_at" TIMESTAMP(3);
