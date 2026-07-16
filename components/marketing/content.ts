// Verbatim reference copy shared across marketing pages (Home / About / Contact / Product).
// Single source of truth so reused blocks (FAQ, testimonials, projects, stats) stay in sync.
import type { FaqItem } from "@/components/marketing/faq-accordion";

export const CONTACT_INFO = {
  phone: "+1603-233-1119",
  phoneHref: "tel:+16032331119",
  email: "info@trbpayoutsystem.us",
  emailHref: "mailto:info@trbpayoutsystem.us",
  address: ["1600 Pennsylvania Ave NW", "Washington, DC 20500"],
};

export const CASHOUT_STEPS = [
  {
    title: "Your Product Is Money",
    text: "You didn't just collect memorabilia; you claimed a symbol of enduring value. Every TRB product you hold represents patriotism, legacy, and true financial potential.",
  },
  {
    title: "Upload & Verify",
    text: "Our streamlined portal makes it effortless. Submit your TRB products digitally for a rapid review by our authorized compliance team to confirm your payout eligibility.",
  },
  {
    title: "Cash Out Seamlessly",
    text: "Once verified, your funds are released instantly. Withdraw directly to your preferred bank account with our bank-grade encrypted transfer system.",
  },
];

export const FEATURES = [
  "Backup By Trump",
  "Your Product Has Value",
  "Great Support System",
  "Fast Withdrawal",
];

export const TRUMP_MESSAGE_QUOTES = [
  "We will no longer surrender this country or its people to the false song of globalism. Your TRB product represents standing against that surrender. It's time to claim your value as a proud American.",
  "I'm not a politician — I'm a businessman. That's the kind of thinking our country needs.",
];

export const PROJECTS = [
  { title: "Golden TRB Check", image: "/marketing/project_card_1.jpg" },
  { title: "Gold TRB Coin", image: "/marketing/project_card_2.jpg" },
  { title: "Freedom Rebate Card", image: "/marketing/project_card_3.jpg" },
];

// Home shows literal zeros (matching the reference); About shows real figures.
export const STATS_HOME = [
  { value: "$0B+", label: "TRB Payouts" },
  { value: "0M+", label: "Successful" },
  { value: "0M+", label: "Happy Cashouts" },
  { value: "24/7", label: "Team Support" },
];

export const STATS_ABOUT = [
  { value: "$1B+", label: "TRB Payouts" },
  { value: "100M+", label: "Successful" },
  { value: "30M+", label: "Happy Cashouts" },
  { value: "24/7", label: "Team Support" },
];

export const TESTIMONIALS = [
  {
    name: "Maggie J.",
    avatar: "/marketing/testimonials/testi_2_1.png",
    quote:
      "I uploaded my TRB check and received my reward in 2 days! Feels great to be a verified patriot!",
  },
  {
    name: "Karen W.",
    avatar: "/marketing/testimonials/testi_2_2.png",
    quote:
      "At first I thought this was just a souvenir, but when I redeemed it, I realized it was something bigger — it was validation of my belief.",
  },
  {
    name: "Michael T.",
    avatar: "/marketing/testimonials/testi_2_3.png",
    quote:
      "My whole family got involved. We each had TRB cards and submitted them. The response was fast, and the recognition felt personal.",
  },
  {
    name: "Denise L.",
    avatar: "/marketing/testimonials/testi_2_4.png",
    quote:
      "I was skeptical, but the redemption process was smooth. The team was responsive and professional. Proud to be verified!",
  },
];

export const BLOG = [
  {
    category: "Market Analysis",
    title: "How Trump-Era Policies Continue to Influence Modern Stock Trends",
    excerpt:
      "Investors look back at historical market rallies to predict future growth. The momentum created by strategic financial policies remains a key driver in today's investments.",
  },
  {
    category: "Wealth Building",
    title: "Securing Your Financial Future With Tangible Assets",
    excerpt:
      "With inflation fluctuating, alternative stores of value and physical assets are increasingly recognized as reliable methods for wealth preservation and growth.",
  },
  {
    category: "Economy",
    title: "The Ripple Effect: Patriotism Meeting Economic Opportunity",
    excerpt:
      "As the nation focuses on domestic prosperity, specialized markets and verified collectible programs are seeing unprecedented participation and rewarding returns.",
  },
];

export const FAQ: FaqItem[] = [
  {
    q: "What is a TRB product and why should I redeem it?",
    a: "Explore the variety of volunteer opportunities available. From event planning and fundraising to fieldwork and administrative support, there are many ways to lend your talents. Find the perfect fit for your skills and interests.",
  },
  {
    q: "Is this a financial institution or bank service?",
    a: "No. This platform is not a bank and does not handle actual cash transactions. It is a verification and recognition portal for TRB product holders to register and claim their rewards or access potential benefits.",
  },
  {
    q: "How long does redemption take?",
    a: "After you submit your product, verification may take 24 to 72 hours depending on demand. You'll receive a status update and any reward notifications by email.",
  },
  {
    q: "What types of TRB products can I redeem?",
    a: "You can redeem: TRB Membership Cards, TRB Golden Checks, TRB Coins, TRB VIP Bundles, TRB Diamond Notes, and other official TRB collectibles.",
  },
];
