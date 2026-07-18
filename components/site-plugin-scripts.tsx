import Script from "next/script";

import { getSettings } from "@/lib/settings/store";

// Renders the third-party tags configured in admin Settings → Plugins. Until now those toggles
// (Analytics provider + ID, Chat provider + property ID) were stored and never read — enabling
// them did nothing. This is the reader.
//
// Server component: it reads settings directly and emits <Script> tags. Nothing here is secret
// (a GA measurement ID and a chat property ID are public embed identifiers), so all of it is
// safe in the client document. afterInteractive keeps these off the critical path.
//
// Mounted once in the root layout, so it covers every surface an operator would want tracked —
// marketing, the auth funnel, and the signed-in app. It also loads on /admin; an operator who
// doesn't want their own console counted can exclude admin traffic in the provider itself
// (GA/GTM both support this), which is the conventional place for that rule.

function analyticsScripts(provider: string, id: string) {
  if (!id) return null;

  if (provider === "ga4") {
    return (
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(id)});`}
        </Script>
      </>
    );
  }

  if (provider === "gtm") {
    return (
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(id)});`}
      </Script>
    );
  }

  return null;
}

// Each provider's documented loader, parameterized by the property/site ID. These are inline
// bootstraps rather than a single <script src> because that's how most of these vendors ship —
// the ID is baked into the snippet, not a query param. JSON.stringify quotes the ID safely for
// the JS string context.
function chatScripts(provider: string, propertyId: string) {
  if (!propertyId) return null;
  const id = JSON.stringify(propertyId);

  switch (provider) {
    case "tawk":
      return (
        <Script id="tawk-init" strategy="afterInteractive">
          {`var Tawk_API=Tawk_API||{},Tawk_LoadStart=new Date();(function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];s1.async=true;s1.src='https://embed.tawk.to/'+${id}+'/default';s1.charset='UTF-8';s1.setAttribute('crossorigin','*');s0.parentNode.insertBefore(s1,s0);})();`}
        </Script>
      );
    case "tidio":
      return (
        <Script src={`https://code.tidio.co/${encodeURIComponent(propertyId)}.js`} strategy="afterInteractive" />
      );
    case "jivo":
      return (
        <Script src={`https://code.jivosite.com/widget/${encodeURIComponent(propertyId)}`} strategy="afterInteractive" />
      );
    case "smartsupp":
      return (
        <Script id="smartsupp-init" strategy="afterInteractive">
          {`var _smartsupp=_smartsupp||{};_smartsupp.key=${id};window.smartsupp||(function(d){var s,c,o=smartsupp=function(){o._.push(arguments)};o._=[];s=d.getElementsByTagName('script')[0];c=d.createElement('script');c.type='text/javascript';c.charset='utf-8';c.async=true;c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);})(document);`}
        </Script>
      );
    case "livechat":
      return (
        <Script id="livechat-init" strategy="afterInteractive">
          {`window.__lc=window.__lc||{};window.__lc.license=${id};(function(n,t,c){function i(n){return e._h?e._h.apply(null,n):e._q.push(n)}var e={_q:[],_h:null,_v:"2.0",on:function(){i(["on",c.call(arguments)])},once:function(){i(["once",c.call(arguments)])},off:function(){i(["off",c.call(arguments)])},get:function(){if(!e._h)throw new Error("[LiveChatWidget] You can't use getters before load.");return i(["get",c.call(arguments)])},call:function(){i(["call",c.call(arguments)])},init:function(){var n=t.createElement("script");n.async=!0,n.type="text/javascript",n.src="https://cdn.livechatinc.com/tracking.js",t.head.appendChild(n)}};!n.__lc.asyncInit&&e.init(),n.LiveChatWidget=n.LiveChatWidget||e}(window,document,[].slice));`}
        </Script>
      );
    case "chatwoot":
      return (
        <Script id="chatwoot-init" strategy="afterInteractive">
          {`(function(d,t){var BASE_URL="https://app.chatwoot.com";var g=d.createElement(t),s=d.getElementsByTagName(t)[0];g.src=BASE_URL+"/packs/js/sdk.js";g.defer=true;g.async=true;s.parentNode.insertBefore(g,s);g.onload=function(){window.chatwootSDK.run({websiteToken:${id},baseUrl:BASE_URL})}})(document,"script");`}
        </Script>
      );
    default:
      return null;
  }
}

export async function SitePluginScripts() {
  const plugins = await getSettings("plugins");

  const analytics =
    plugins.analyticsEnabled && plugins.analyticsProvider
      ? analyticsScripts(plugins.analyticsProvider, plugins.analyticsMeasurementId)
      : null;
  const chat =
    plugins.chatEnabled && plugins.chatProvider
      ? chatScripts(plugins.chatProvider, plugins.chatPropertyId)
      : null;

  if (!analytics && !chat) return null;
  return (
    <>
      {analytics}
      {chat}
    </>
  );
}
