// Canonical marketing content, transcribed verbatim from the previously
// hardcoded pages. Used two ways:
//   1. scripts/seed-cms.ts inserts it as the initial database content, so the
//      site looks identical on day one and admins edit it from there.
//   2. lib/home/cms.ts serves it as the fallback when a component/page row is
//      missing (e.g. a fresh database), so the marketing site can never render
//      blank sections.
// Edit content in the admin (/admin/pages), not here — after seeding, this file
// only matters as the fallback and for `db:seed:cms --force` resets.
import type { CmsData } from "./types";

export type SeedComponent = {
  key: string;
  name: string;
  schemaKey: string;
  type?: "static" | "dynamic";
  isGlobal?: boolean;
  content: CmsData;
  collections?: Record<string, CmsData[]>;
};

export type SeedPage = {
  slug: string;
  path: string;
  title: string;
  breadcrumb: string | null;
  sections: string[]; // component keys in render order
};

export const SEED_PAGES: SeedPage[] = [
  {
    slug: "home",
    path: "/",
    title: "Home",
    breadcrumb: null,
    sections: [
      "hero",
      "trump-message",
      "cashout-process",
      "video-message",
      "dual-quote",
      "features",
      "success-story",
      "projects",
      "think-big",
      "testimonials",
      "blog-teasers",
      "faq",
    ],
  },
  {
    slug: "about",
    path: "/about",
    title: "About Us",
    breadcrumb: "About Us",
    sections: ["about-intro", "think-big", "about-tabs", "redemption"],
  },
  {
    slug: "contact",
    path: "/contact",
    title: "Contact Us",
    breadcrumb: null,
    sections: ["contact-hero", "contact-block", "faq"],
  },
  {
    slug: "product",
    path: "/product",
    title: "Product",
    breadcrumb: "Product",
    sections: ["product-intro", "projects", "product-cta"],
  },
  {
    slug: "service",
    path: "/service",
    title: "Service",
    breadcrumb: "Service",
    sections: ["service-intro", "cashout-process", "features", "service-cta"],
  },
  {
    slug: "help",
    path: "/help",
    title: "Support",
    breadcrumb: "Support",
    sections: ["help-intro", "support-cards", "help-contact-banner", "help-account-cta"],
  },
  {
    slug: "privacy-policy",
    path: "/privacy-policy",
    title: "Privacy Policy",
    breadcrumb: "Privacy policy",
    sections: ["privacy-body", "privacy-contact", "privacy-cta"],
  },
];

const PRIVACY_BODY_HTML = [
  "<h2>1. Introduction</h2>",
  "<p>Welcome to the Trump Rebate Banking (TRB) verification portal. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect when you visit our website and use our services, how we use it, and the rights you have in relation to it.</p>",
  "<p>Please note that this platform is a product-verification and recognition portal. It is <strong>not a bank and does not handle actual cash transactions</strong>. We seek to explain, in the clearest way possible, exactly how your information is handled so you can use our services with confidence.</p>",
  "<h2>2. Information We Collect</h2>",
  "<p>We collect personal information that you voluntarily provide to us when you register for an account, submit a TRB product for verification, or otherwise contact us. The information we collect depends on the context of your interactions with us and the choices you make, and may include:</p>",
  "<ul><li>Name and contact data, such as your email address and phone number.</li><li>Account credentials and identifiers used to secure your portal access.</li><li>Details and images of the TRB products you submit for verification.</li><li>Technical data, such as your device type, browser, and usage information.</li></ul>",
  "<h2>3. How We Use Your Information</h2>",
  "<p>We use the personal information collected via our website for a variety of business purposes, in reliance on our legitimate business interests, to perform our services for you, with your consent, and to comply with our legal obligations. Specifically, we use your information to:</p>",
  "<ul><li>Facilitate account creation and the secure log-in process.</li><li>Review, validate, and manage your product-verification requests.</li><li>Send you administrative information and status updates.</li><li>Respond to your inquiries and provide support.</li><li>Protect our services and prevent fraudulent or unauthorized activity.</li></ul>",
  "<h2>4. Data Protection &amp; Security</h2>",
  "<p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please remember that no method of transmission over the internet is 100% secure. Although we do our best to protect your personal information, transmission to and from our website is at your own risk, and you should only access our services within a secure environment.</p>",
  "<p>We retain your personal information only for as long as necessary to fulfil the purposes set out in this policy, unless a longer retention period is required or permitted by law.</p>",
  "<h2>5. Cookies &amp; Tracking Technologies</h2>",
  "<p>We may use cookies and similar tracking technologies to access or store information. These help us keep you signed in, remember your preferences, and understand how our portal is used so we can improve it. You can set your browser to refuse cookies or to alert you when cookies are being sent; however, some parts of the website may not function properly without them.</p>",
  "<h2>6. Third-Party Services</h2>",
  "<p>We only share information with your consent, to comply with applicable laws, to provide you with our services, to protect your rights, or to fulfil legitimate business obligations. We do <strong>not sell or rent</strong> your personal information to third parties for marketing purposes. Where we rely on trusted service providers to operate our portal, they are permitted to use your information only as necessary to perform services on our behalf.</p>",
  "<h2>7. Your Privacy Rights</h2>",
  "<p>Depending on your location, you may have certain rights regarding your personal information, including the right to:</p>",
  "<ul><li>Request access to and a copy of the information we hold about you.</li><li>Request that we correct or update inaccurate information.</li><li>Request that we delete your personal information, subject to legal limits.</li><li>Withdraw your consent at any time where we rely on it to process your data.</li></ul>",
  "<p>To exercise any of these rights, please contact us using the details below.</p>",
  "<h2>8. Changes to This Policy</h2>",
  "<p>We may update this Privacy Policy from time to time. The updated version will be indicated by a revised “Last updated” date and will be effective as soon as it is accessible. We encourage you to review this policy periodically to stay informed about how we protect your information.</p>",
].join("");

export const SEED_COMPONENTS: SeedComponent[] = [
  // ------------------------------ site chrome ------------------------------
  {
    key: "site-nav",
    name: "Site Navigation",
    schemaKey: "site-nav",
    isGlobal: true,
    content: { signInLabel: "Sign in", joinLabel: "Join Now" },
    collections: {
      links: [
        { label: "Home", href: "/" },
        { label: "Service", href: "/service" },
        { label: "Product", href: "/product" },
        { label: "About Us", href: "/about" },
        { label: "Contact Us", href: "/contact" },
      ],
    },
  },
  {
    key: "site-footer",
    name: "Site Footer",
    schemaKey: "site-footer",
    isGlobal: true,
    content: {
      joinLabel: "Join Now",
      quickLinksHeading: "Quick Links",
      contactHeading: "Contact Us",
      phoneLabel: "Support",
      emailLabel: "Email us any time:",
      presidentLabel: "Email the President's office:",
      presidentEmail: "presidentdonaldtrump@trbpayoutsupport.us",
      rightsText: "All Rights Reserved.",
    },
    collections: {
      links: [
        { label: "About Us", href: "/about" },
        { label: "Privacy policy", href: "/privacy-policy" },
        { label: "Contact Us", href: "/contact" },
        { label: "Support", href: "/help" },
      ],
    },
  },

  // ------------------------------ home ------------------------------
  {
    key: "hero",
    name: "Home Hero",
    schemaKey: "hero",
    content: {
      headline: "The Wait Is Over. Your Product Is Money",
      subheadline:
        "You didn't just collect a mere memorabilia. You claimed a symbol of value. Every TRB product you hold represents patriotism, legacy, and potential wealth.",
      videoSrc: "/marketing/hero-bg.mp4",
      posterImage: "/marketing/american_flag.png",
      primaryCtaLabel: "Register Now",
      primaryCtaHref: "/register",
      secondaryCtaLabel: "Login Now",
      secondaryCtaHref: "/login",
    },
    collections: {
      badges: [
        { text: "[[SECURE]] payout" },
        { text: "[[TRB]] SYSTEM" },
        { text: "[[USA]] TREASURY" },
        { text: "PATRIOT", icon: "shield-check" },
      ],
      steps: [
        {
          icon: "id-card",
          title: "Register Account",
          text: "Create your portal access and set up your secure profile",
        },
        {
          icon: "upload",
          title: "Upload & Verify",
          text: "Submit your physical or digital products for system review",
        },
        {
          icon: "banknote",
          title: "Cash Out & Get Paid",
          text: "Withdraw your verified funds directly to your preferred account",
        },
      ],
    },
  },
  {
    key: "trump-message",
    name: "Thank You Message",
    schemaKey: "image-message",
    content: {
      heading: "Thank you for trusting me.",
      body: "The Trump Rebate Banking System (TRBS) is a federally supported economic initiative launched by me, President Donald J. Trump to stimulate consumer spending, reward patriotism, and promote financial sovereignty among American citizens. I launched this initiative during my first term, but after spending four years out of office, I was reelected to continue pursuing the vision of a true American Golden Age. Now, loyal patriots who purchased TRB products when the initiative was first launched have what the initiative describes as a once-in-a-lifetime opportunity to redeem their products and potentially receive payouts worth millions of dollars, subject to the program's terms and conditions. All patriots are expected to comply with all applicable federal income tax requirements related to their TRB payout. By fulfilling these obligations, you demonstrate your commitment to following U.S. laws and contributing to a strong and financially stable nation.",
      signature: "Donald J. Trump",
      image: "/marketing/american_flag.png",
      imageAlt: "Framed American flag",
    },
  },
  {
    key: "cashout-process",
    name: "Cash-Out Process",
    schemaKey: "steps-section",
    content: {
      eyebrow: "How It Works",
      heading: "The Cash-Out Process",
    },
    collections: {
      steps: [
        {
          icon: "dollar-sign",
          title: "Your Product Is Money",
          text: "You didn't just collect memorabilia; you claimed a symbol of enduring value. Every TRB product you hold represents patriotism, legacy, and true financial potential.",
        },
        {
          icon: "upload",
          title: "Upload & Verify",
          text: "Our streamlined portal makes it effortless. Submit your TRB products digitally for a rapid review by our authorized compliance team to confirm your payout eligibility.",
        },
        {
          icon: "banknote",
          title: "Cash Out Seamlessly",
          text: "Once verified, your funds are released instantly. Withdraw directly to your preferred bank account with our bank-grade encrypted transfer system.",
        },
      ],
    },
  },
  {
    key: "video-message",
    name: "Video Message",
    schemaKey: "video-message",
    content: {
      heading: "A Message From [[Donald J. Trump]]",
      subtext: "Click the video to watch the full clip",
      videoSrc: "/marketing/trumpvid.mp4",
    },
  },
  {
    key: "dual-quote",
    name: "Trump Quotes",
    schemaKey: "quotes",
    content: { signature: "Donald J. Trump" },
    collections: {
      quotes: [
        {
          text: "We will no longer surrender this country or its people to the false song of globalism. Your TRB product represents standing against that surrender. It's time to claim your value as a proud American.",
        },
        {
          text: "I'm not a politician — I'm a businessman. That's the kind of thinking our country needs.",
        },
      ],
    },
  },
  {
    key: "features",
    name: "Feature Highlights",
    schemaKey: "features",
    content: {
      eyebrow: "Why Choose Us",
      heading: "Built For Patriots, Trusted For Payouts",
    },
    collections: {
      items: [
        {
          icon: "shield-check",
          label: "Backup By Trump",
          blurb:
            "Part of the Trump Rebate Banking initiative that celebrates patriotism and financial confidence.",
        },
        {
          icon: "badge-check",
          label: "Your Product Has Value",
          blurb: "What you hold is more than memorabilia — it carries real, verifiable rebate value.",
        },
        {
          icon: "headphones",
          label: "Great Support System",
          blurb:
            "Our team guides you through every step, from registration to final payout, around the clock.",
        },
        {
          icon: "zap",
          label: "Fast Withdrawal",
          blurb:
            "Once your product is verified, funds are released quickly to your preferred bank account.",
        },
      ],
    },
  },
  {
    key: "success-story",
    name: "Success Story",
    schemaKey: "feature-banner",
    content: {
      badge: "Success Story",
      heading:
        "Our platform exists to honor the [[belief, commitment,]] and [[patriotism]] shown by Trump supporters.",
      body: "While TRB products are not affiliated with any local bank, they are federally authorized financial instruments established by the U.S. government for the benefit of every American. As such, they carry significant financial and symbolic value. To redeem your TRB product through our process, you are required to complete an exclusive verification procedure and satisfy all applicable federal mandatory tax clearance requirements.",
      ctaLabel: "CASHOUT NOW",
      ctaHref: "/register",
      image: "/marketing/trump_custom.jpg",
      imageAlt: "Donald J. Trump",
    },
  },
  {
    key: "projects",
    name: "Verified Products",
    schemaKey: "projects",
    content: {
      heading: "TRB Is A Verified Project",
      seeAllLabel: "See all",
      seeAllHref: "/product",
      verifiedLabel: "Verified",
      cardCtaLabel: "Grab The Opportunity",
      cardCtaHref: "/register",
    },
    collections: {
      items: [
        {
          image: "/marketing/project_card_1.jpg",
          title: "Golden TRB Check",
          description:
            "A verified golden certificate redeemable for its full rebate value once your holding is confirmed.",
        },
        {
          image: "/marketing/project_card_2.jpg",
          title: "Gold TRB Coin",
          description:
            "A collectible gold-finish coin recognized as a verified TRB asset that is eligible for payout.",
        },
        {
          image: "/marketing/project_card_3.jpg",
          title: "Freedom Rebate Card",
          description:
            "The membership card that unlocks your rebate credits and grants priority verification.",
        },
      ],
    },
  },
  {
    key: "think-big",
    name: "Stats & Think Big",
    schemaKey: "stats-banner",
    content: {
      heading: "You have to think anyway,",
      headingAccent: "so why not think big?",
      body: "Holding a TRB product means you believed in something bigger. Cashing it now is the bold step forward.",
      backgroundImage: "/marketing/american_flag.png",
    },
    collections: {
      stats: [
        { prefix: "$", value: 3.8, decimals: 1, suffix: "B+", label: "TRB Payouts" },
        { prefix: "", value: 100, decimals: 0, suffix: "M+", label: "Successful" },
        { prefix: "", value: 100, decimals: 0, suffix: "M+", label: "Happy Cashouts" },
        { prefix: "", value: 24, decimals: 0, suffix: "/7", label: "Team Support" },
      ],
    },
  },
  {
    key: "testimonials",
    name: "Testimonials",
    schemaKey: "testimonials",
    content: { heading: "Testimonials" },
    collections: {
      items: [
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
        {
          name: "Robert K.",
          quote:
            "I kept my TRB coin framed for years thinking it was just decor. Redeeming it turned a keepsake into real value — and the process couldn't have been simpler.",
        },
        {
          name: "Sandra P.",
          quote:
            "As a retiree I appreciated how patient and clear the verification team was. They walked me through every step and my payout arrived right on time.",
        },
        {
          name: "James O.",
          quote:
            "I refer everyone I know now. Three of my friends have already cashed out their TRB products after seeing mine go through without a hitch.",
        },
        {
          name: "Linda M.",
          quote:
            "What sold me was the transparency. I could track my submission the whole way, and the reward hit my account exactly as promised.",
        },
      ],
    },
  },
  {
    key: "blog-teasers",
    name: "Latest Updates",
    schemaKey: "blog-teasers",
    content: {
      badge: "Latest Updates",
      heading: "Trump, Investments & Market News",
      fallbackSource: "TRB Payout System",
    },
    collections: {
      fallbacks: [
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
      ],
    },
  },
  {
    key: "faq",
    name: "FAQ",
    schemaKey: "faq",
    content: {
      badge: "Frequently Asked Questions",
      heading: "Have Any Questions For Us?",
    },
    collections: {
      items: [
        {
          question: "What is a TRB product and why should I redeem it?",
          answer:
            "To begin, the acronym TRB represents Trump Rebate Banking. The Trump Rebate Banking System (TRBS) is a federally supported economic initiative launched by President Donald J. Trump to stimulate consumer spending, reward patriotism, and promote financial sovereignty among American citizens. You didn't just collect a mere memorabilia. You claimed a symbol of value. Every TRB product you hold represents patriotism, legacy, and potential wealth as a True American. Why should I redeem it? The American Golden Age is here, and redeeming your TRB is presented as an opportunity to pursue greater financial prosperity. TRB products gives you the opportunity to receive millions in payouts.",
        },
        {
          question: "Is this a financial institution or bank service?",
          answer:
            "Trump Rebate Banking (TRB) is a federally approved financial system rather than a traditional local bank. It was designed to serve American citizens by providing a structured redemption process for patriots who purchased TRB products. After years of waiting, eligible holders will redeem their products and, if they qualify under the program's terms, receive their designated payouts successfully. The initiative presents a broader vision to support what our President describe as the True American Golden Age.",
        },
        {
          question: "How long does redemption take?",
          answer:
            "Customer experience is at the heart of everything we do. It's why we come to work each day. Eligible payouts are typically credited to your TRB account within 24 to 48 hours after your redemption is successfully processed. Once the funds are available in your TRB account, you may transfer them to your personal bank account at your convenience, subject to the program's terms and any applicable banking procedures. Also, don't forget that our rockstar customer support are here for all your day-to-day and technical questions 24/7. And finally, we totally get that there's nothing on the internet more intimate than your inbox, so we never bombard our users with unwanted emails. We respect that wholeheartedly.",
        },
        {
          question: "What types of TRB products can I redeem?",
          answer: "All kinds of TRB products and memorabilia can be redeem for cash rewards.",
        },
      ],
    },
  },

  // ------------------------------ about ------------------------------
  {
    key: "about-intro",
    name: "About Intro",
    schemaKey: "about-intro",
    content: {
      eyebrow: "Trump Rebate Banking System",
      heading: "The Trump Rebate Banking System (TRBS)",
      body: "A federally supported economic initiative launched by President Donald J. Trump to stimulate consumer spending, reward patriotism, and promote financial sovereignty among American citizens.",
      image: "/marketing/american_flag.png",
      imageAlt: "Framed American flag",
      badgeTop: "Federally",
      badgeBottom: "Supported",
      purposeHeading: "Purpose",
    },
    collections: {
      purpose: [
        {
          text: "To reward eligible Americans for their contributions to the economy, military service, or loyalty.",
        },
        {
          text: "To return value to citizens in the form of rebate credits, redeemable through participating banks.",
        },
        {
          text: "To create a parallel incentive system encouraging the purchase of American goods and services.",
        },
      ],
    },
  },
  {
    key: "about-tabs",
    name: "About Tabs",
    schemaKey: "tabs",
    content: {},
    collections: {
      tabs: [
        {
          label: "How It Works",
          icon: "coins",
          accent: "gold",
          heading: "How It Works",
          items: [
            "Citizens enroll in the TRBS program through government portals or authorized banks.",
            "Participants accumulate “Patriot Points” or direct TRBS credits through specific actions (e.g., buying American-made products, military service, continuous employment).",
            "These credits are stored in a designated TRBS account linked to their SSN or a dedicated federal ID.",
            "Credits can be redeemed for cash, tax deductions, or used as collateral for federally backed loans.",
          ],
        },
        {
          label: "Institutional Support",
          icon: "landmark",
          accent: "sky",
          heading: "Institutional Support",
          items: [
            "TRBS operates alongside participating banks and authorized financial partners.",
            "Verification is handled by an authorized compliance team before any payout is approved.",
            "Payouts are processed through bank-grade, encrypted transfers straight to your account.",
          ],
        },
        {
          label: "Goals & Safeguards",
          icon: "shield",
          accent: "emerald",
          heading: "Goals & Safeguards",
          items: [
            "Reward the patriotism, service, and loyalty of everyday Americans.",
            "Protect participants with strict, fraud-resistant verification on every account.",
            "Confirm each submission through trusted channels before a single credit is released.",
          ],
        },
        {
          label: "Narrative & Branding",
          icon: "flag",
          accent: "red",
          heading: "Narrative & Branding",
          items: [
            "Honor the belief that holding a TRB product represents something bigger.",
            "Recognize the commitment and sacrifice of proud supporters across the country.",
            "Celebrate the patriotism that unites the TRBS community as one movement.",
          ],
        },
      ],
    },
  },
  {
    key: "redemption",
    name: "Redemption Process",
    schemaKey: "steps-section",
    content: {
      eyebrow: "Final Thought",
      eyebrowIcon: "flag",
      heading: "The TRBS Redemption Process",
    },
    collections: {
      steps: [
        {
          icon: "user-plus",
          title: "Register",
          text: "Create your secure account and verify your identity on our platform.",
          accent: "blue",
        },
        {
          icon: "upload",
          title: "Upload Product",
          text: "Securely upload details of your eligible TRB products or actions.",
          accent: "blue",
        },
        {
          icon: "badge-check",
          title: "Product Gets Verified",
          text: "Our team validates your submission through federal channels.",
          accent: "blue",
        },
        {
          icon: "banknote",
          title: "Get Paid",
          text: "Receive your TRBS credits or direct payout to your connected bank.",
          accent: "emerald",
        },
      ],
    },
  },

  // ------------------------------ contact ------------------------------
  {
    key: "contact-hero",
    name: "Contact Hero",
    schemaKey: "simple-hero",
    content: {
      heading: "Get In Touch",
      subtext:
        "Have questions about your TRB products or the redemption process? We are here to help. Reach out to our dedicated support team today.",
    },
  },
  {
    key: "contact-block",
    name: "Contact Block",
    schemaKey: "contact-block",
    content: {
      image: "/marketing/customer_care_rep_2.png",
      imageAlt: "TRB Payout System customer care representative",
      addressLabel: "Address",
      phoneLabel: "Phone",
      emailLabel: "Email",
      formHeading: "Send Us a Message",
      formSubtext: "Fill out the form below and our team will get back to you as soon as possible.",
    },
  },

  // ------------------------------ product ------------------------------
  {
    key: "product-intro",
    name: "Product Intro",
    schemaKey: "intro",
    content: {
      eyebrow: "The Collection",
      heading: "TRB Verified Products",
      body: "Every item in the TRB collection is more than memorabilia — it is a verified asset that carries real rebate value. Explore the products below, confirm your holding, and grab the opportunity to cash out.",
    },
  },
  {
    key: "product-cta",
    name: "Product CTA",
    schemaKey: "cta-band",
    content: {
      heading: "Turn Your Product Into Value",
      body: "Register now to verify your TRB products and unlock your rebate — every item you hold is ready to be claimed.",
      primaryCtaLabel: "Grab The Opportunity",
      primaryCtaHref: "/register",
      secondaryCtaLabel: "Login Now",
      secondaryCtaHref: "/login",
    },
  },

  // ------------------------------ service ------------------------------
  {
    key: "service-intro",
    name: "Service Intro",
    schemaKey: "intro",
    content: {
      eyebrow: "Verification & Payout",
      heading: "A Trusted Service For Every TRB Holder",
      body: "Our service exists to verify your TRB products and release their value to you. Register your item, let our authorized compliance team confirm your eligibility, and cash out directly to your bank with a secure, bank-grade encrypted transfer — all from one streamlined portal.",
    },
  },
  {
    key: "service-cta",
    name: "Service CTA",
    schemaKey: "cta-band",
    content: {
      heading: "Ready To Claim What's Yours?",
      body: "Register today and let our team verify your TRB products so you can cash out with confidence.",
      primaryCtaLabel: "Register Now",
      primaryCtaHref: "/register",
      secondaryCtaLabel: "Login Now",
      secondaryCtaHref: "/login",
    },
  },

  // ------------------------------ help ------------------------------
  {
    key: "help-intro",
    name: "Help Intro",
    schemaKey: "intro",
    content: {
      eyebrow: "We're Here to Help",
      heading: "How can we support you?",
      body: "Whether you need help creating your portal access, verifying a TRB product, or checking the status of a request, our support team is ready 24/7. Choose the option that works best for you.",
    },
  },
  {
    key: "support-cards",
    name: "Support Cards",
    schemaKey: "support-cards",
    content: {},
    collections: {
      items: [
        {
          icon: "phone",
          title: "Call Support",
          text: "Speak directly with our verification team. We're available around the clock to help with your account and payouts.",
          kind: "phone",
        },
        {
          icon: "mail",
          title: "Email Us",
          text: "Send us your questions any time and our team will respond promptly with the guidance you need.",
          kind: "email",
        },
        {
          icon: "help-circle",
          title: "Visit the FAQ",
          text: "Find quick answers to the most common questions about verifying and redeeming your TRB products.",
          kind: "link",
          linkLabel: "Browse FAQ",
          href: "/#faq",
        },
      ],
    },
  },
  {
    key: "help-contact-banner",
    name: "Help Contact Banner",
    schemaKey: "contact-banner",
    content: {
      heading: "Prefer to send a message?",
      body: "Reach out through our contact form and we'll get back to you as soon as possible.",
      ctaLabel: "Contact Us",
      ctaHref: "/contact",
    },
  },
  {
    key: "help-account-cta",
    name: "Help Account CTA",
    schemaKey: "account-cta",
    content: {
      lead: "New here, or ready to pick up where you left off?",
      primaryCtaLabel: "Register Now",
      primaryCtaHref: "/register",
      secondaryCtaLabel: "Login",
      secondaryCtaHref: "/login",
    },
  },

  // ------------------------------ privacy ------------------------------
  {
    key: "privacy-body",
    name: "Privacy Policy Body",
    schemaKey: "richtext",
    type: "dynamic",
    content: {
      lastUpdated: "Last updated: July 2026",
      body: PRIVACY_BODY_HTML,
    },
  },
  {
    key: "privacy-contact",
    name: "Privacy Contact",
    schemaKey: "policy-contact",
    content: {
      heading: "9. Contact Us",
      body: "If you have questions or comments about this policy, you may reach us by phone, by email, or by post:",
      phonePrefix: "Phone:",
      emailPrefix: "Email:",
      postPrefix: "Post:",
    },
  },
  {
    key: "privacy-cta",
    name: "Privacy CTA",
    schemaKey: "inline-cta",
    content: {
      heading: "Ready to verify your TRB product?",
      body: "Create your secure portal access in minutes.",
      primaryCtaLabel: "Register Now",
      primaryCtaHref: "/register",
      secondaryCtaLabel: "Login",
      secondaryCtaHref: "/login",
    },
  },
];

export const SEED_COMPONENTS_BY_KEY = new Map(SEED_COMPONENTS.map((c) => [c.key, c]));
export const SEED_PAGES_BY_SLUG = new Map(SEED_PAGES.map((p) => [p.slug, p]));
