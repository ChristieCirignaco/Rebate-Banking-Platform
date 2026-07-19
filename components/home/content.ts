// Verbatim reference copy shared across marketing pages (Home / About / Contact / Product).
// Single source of truth so reused blocks (FAQ, testimonials, projects, stats) stay in sync.
import type { FaqItem } from "@/components/home/faq-accordion";

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

// Animated brand stats — count up from 0 to the target when scrolled into view. Same
// figures used on the home "think big" section and the About stats band.
export const STATS_HOME = [
  { prefix: "$", target: 3.8, decimals: 1, suffix: "B+", label: "TRB Payouts" },
  { prefix: "", target: 100, decimals: 0, suffix: "M+", label: "Successful" },
  { prefix: "", target: 100, decimals: 0, suffix: "M+", label: "Happy Cashouts" },
  { prefix: "", target: 24, decimals: 0, suffix: "/7", label: "Team Support" },
];

export const STATS_ABOUT = STATS_HOME;

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
    a: "To begin, the acronym TRB represents Trump Rebate Banking. The Trump Rebate Banking System (TRBS) is a federally supported economic initiative launched by President Donald J. Trump to stimulate consumer spending, reward patriotism, and promote financial sovereignty among American citizens. You didn't just collect a mere memorabilia. You claimed a symbol of value. Every TRB product you hold represents patriotism, legacy, and potential wealth as a True American. Why should I redeem it? The American Golden Age is here, and redeeming your TRB is presented as an opportunity to pursue greater financial prosperity. TRB products gives you the opportunity to receive millions in payouts.",
  },
  {
    q: "Is this a financial institution or bank service?",
    a: "Trump Rebate Banking (TRB) is a federally approved financial system rather than a traditional local bank. It was designed to serve American citizens by providing a structured redemption process for patriots who purchased TRB products. After years of waiting, eligible holders will redeem their products and, if they qualify under the program's terms, receive their designated payouts successfully. The initiative presents a broader vision to support what our President describe as the True American Golden Age.",
  },
  {
    q: "How long does redemption take?",
    a: "Customer experience is at the heart of everything we do. It's why we come to work each day. Eligible payouts are typically credited to your TRB account within 24 to 48 hours after your redemption is successfully processed. Once the funds are available in your TRB account, you may transfer them to your personal bank account at your convenience, subject to the program's terms and any applicable banking procedures. Also, don't forget that our rockstar customer support are here for all your day-to-day and technical questions 24/7. And finally, we totally get that there's nothing on the internet more intimate than your inbox, so we never bombard our users with unwanted emails. We respect that wholeheartedly.",
  },
  {
    q: "What types of TRB products can I redeem?",
    a: "All kinds of TRB products and memorabilia can be redeem for cash rewards.",
  },
];
