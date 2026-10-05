# Link report: cancel directory and format help

Checked 2026-10-05T01:27:11.339Z (2026-10-04 ET). Scope: all entries. Unique URLs 185, one request per second, user agent `Lintroller-linkcheck/1.0 (+https://lintroller.vercel.app/about)`.
Result: 2xx 119, not 2xx 66 (403 44, 404 10, no response 11, other 1).
Cancel entries 103, verified 60. Format helps with an official URL 6, verified 6.

403 and bot walls are recorded as failed and were not retried with another user agent.

## REVIEW

- REVIEW cancel:sling-tv help: failed, 404 not found
- REVIEW cancel:fubo help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:crunchyroll manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:starz help: failed, no response: UND_ERR_CONNECT_TIMEOUT
- REVIEW cancel:mgm-plus manage: failed, 404 not found
- REVIEW cancel:britbox help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:dazn help: failed, no response: ENOTFOUND
- REVIEW cancel:tidal manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:tidal help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:audible manage: failed, 404 not found
- REVIEW cancel:kindle-unlimited manage: failed, 404 not found
- REVIEW cancel:washington-post manage: failed, no response: ERR_HTTP2_STREAM_ERROR
- REVIEW cancel:washington-post help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:the-atlantic manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:the-atlantic help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:medium manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:medium help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:tinder help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:hinge help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:match help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:xbox-game-pass manage: ok, ends on login.microsoftonline.com, not an entry domain
- REVIEW cancel:nintendo-switch-online manage: failed, no response: timed out after 20 s
- REVIEW cancel:nintendo-switch-online help: failed, 406 not acceptable to this agent; not retried
- REVIEW cancel:discord-nitro help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:ea-play help: failed, no response: ERR_HTTP2_STREAM_ERROR
- REVIEW cancel:roblox help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:google-one help: failed, 404 not found
- REVIEW cancel:dropbox help: failed, 404 not found
- REVIEW cancel:microsoft-365 manage: ok, ends on login.microsoftonline.com, not an entry domain
- REVIEW cancel:adobe help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:canva manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:canva help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:one-password help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:lastpass help: failed, no response: UNABLE_TO_VERIFY_LEAF_SIGNATURE
- REVIEW cancel:nordvpn manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:nordvpn help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:norton manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:norton help: failed, 404 not found
- REVIEW cancel:mcafee manage: failed, no response: ERR_HTTP2_STREAM_ERROR
- REVIEW cancel:mcafee help: failed, no response: ERR_HTTP2_STREAM_ERROR
- REVIEW cancel:chatgpt manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:chatgpt help: failed, no response: ENOTFOUND
- REVIEW cancel:claude manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:notion help: failed, 404 not found
- REVIEW cancel:patreon manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:patreon help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:planet-fitness manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:planet-fitness help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:headspace help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:calm help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:noom manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:noom help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:myfitnesspal help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:classpass manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:classpass help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:whoop manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:doordash-dashpass manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:uber-one manage: failed, 404 not found
- REVIEW cancel:hellofresh help: failed, no response: ENOTFOUND
- REVIEW cancel:factor help: failed, no response: ENOTFOUND
- REVIEW cancel:adt manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:adt help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:lifelock manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:experian help: failed, 404 not found
- REVIEW cancel:life360 help: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:ancestry manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:t-mobile manage: failed, 403 refused (possible bot wall); not retried
- REVIEW cancel:t-mobile help: failed, 403 refused (possible bot wall); not retried

## Checks

| URL | used by | status | ok | final URL | note |
|---|---|---|---|---|---|
| https://www.netflix.com/account | cancel:netflix | 200 | yes | https://www.netflix.com/login?nextpage=https%3A%2F%2Fwww.netflix.com%2Faccount | redirects to sign-in |
| https://help.netflix.com/en/node/407 | cancel:netflix | 200 | yes | https://help.netflix.com/en/node/407 |  |
| https://www.hulu.com/account | cancel:hulu | 200 | yes | https://auth.hulu.com/web/login?next=%2F%2Fsecure.hulu.com%2Faccount | redirects to sign-in |
| https://help.hulu.com/ | cancel:hulu | 200 | yes | https://help.hulu.com/ |  |
| https://www.disneyplus.com/account | cancel:disney-plus | 200 | yes | https://www.disneyplus.com/commerce/account |  |
| https://help.disneyplus.com/article/disneyplus-cancel-subscription | cancel:disney-plus | 200 | yes | https://help.disneyplus.com/article/disneyplus-cancel-subscription |  |
| https://play.max.com/settings/subscription | cancel:hbo-max | 200 | yes | https://auth.hbomax.com/login?returnUrl=https%3A%2F%2Fplay.hbomax.com%2Fsettings%2Fsubscription | redirects to sign-in |
| https://help.max.com/us | cancel:hbo-max | 200 | yes | https://help.hbomax.com/us |  |
| https://www.paramountplus.com/account | cancel:paramount-plus | 200 | yes | https://www.paramountplus.com/account/signin/ | redirects to sign-in |
| https://help.paramountplus.com/ | cancel:paramount-plus | 200 | yes | https://help.paramountplus.com/s/ |  |
| https://www.peacocktv.com/account | cancel:peacock | 200 | yes | https://www.peacocktv.com/signin?return=%2faccount%2fplans | redirects to sign-in |
| https://www.peacocktv.com/help | cancel:peacock | 200 | yes | https://www.peacocktv.com/help |  |
| https://tv.apple.com/account | cancel:apple-tv | 200 | yes | https://finance-app.itunes.apple.com/account |  |
| https://support.apple.com/en-us/118428 | cancel:apple-tv, cancel:apple-music, cancel:apple, cancel:icloud | 200 | yes | https://support.apple.com/en-us/118428 |  |
| https://www.youtube.com/paid_memberships | cancel:youtube-premium, cancel:youtube-music | 200 | yes | https://accounts.google.com/v3/signin/identifier?continue=https://www.youtube.com/signin?action_handle_signin%3Dtrue%26app%3Ddesktop%26hl%3Den%26next%3Dhttps%253A%252F%252Fwww.youtube.com%252Fpaid_memberships%26feature%3Dredirect_login&hl=en&passive=true&service=youtube&uilel=3&flowName=WebLiteSignIn&flowEntry=ServiceLogin&dsh=S-217556445:1791163653411342 | redirects to sign-in |
| https://support.google.com/youtube/answer/6308278 | cancel:youtube-premium | 200 | yes | https://support.google.com/youtube/answer/6308278 |  |
| https://tv.youtube.com/manage/ | cancel:youtube-tv | 200 | yes | https://tv.youtube.com/manage/ |  |
| https://support.google.com/youtubetv/ | cancel:youtube-tv | 200 | yes | https://support.google.com/youtubetv/ |  |
| https://www.sling.com/myaccount | cancel:sling-tv | 200 | yes | https://www.sling.com/account |  |
| https://www.sling.com/help/en/s/article/how-do-i-cancel-my-sling-tv-subscription | cancel:sling-tv | 404 | no | https://www.sling.com/help/en/s/article/how-do-i-cancel-my-sling-tv-subscription | 404 not found |
| https://www.fubo.tv/account | cancel:fubo | 200 | yes | https://www.fubo.tv/account |  |
| https://support.fubo.tv/hc/en-us/articles/115014115988 | cancel:fubo | 403 | no | https://support.fubo.tv/hc/en-us/articles/115014115988 | 403 refused (possible bot wall); not retried |
| https://www.philo.com/account | cancel:philo | 200 | yes | https://www.philo.com/login/authenticate?redirect_uri=https%3A%2F%2Fwww.philo.com%2Fplayer%2Fuser%2Faccount | redirects to sign-in |
| https://help.philo.com/ | cancel:philo | 200 | yes | https://help.philo.com/ |  |
| https://www.crunchyroll.com/acct/membership | cancel:crunchyroll | 403 | no | https://www.crunchyroll.com/acct/membership | 403 refused (possible bot wall); not retried |
| https://help.crunchyroll.com/hc/en-us | cancel:crunchyroll | 200 | yes | https://help.crunchyroll.com/ |  |
| https://www.starz.com/account/subscription | cancel:starz | 200 | yes | https://www.starz.com/us/en/account/subscription |  |
| https://faqs.starz.com/ | cancel:starz | 0 | no | https://faqs.starz.com/ | no response: UND_ERR_CONNECT_TIMEOUT |
| https://www.mgmplus.com/my-account | cancel:mgm-plus | 404 | no | https://www.mgmplus.com/my-account | 404 not found |
| https://www.mgmplus.com/help | cancel:mgm-plus | 200 | yes | https://www.mgmplus.com/help |  |
| https://www.amcplus.com/account | cancel:amc-plus | 200 | yes | https://www.amcplus.com/account |  |
| https://support.amcplus.com/kb/en | cancel:amc-plus | 200 | yes | https://support.amcplus.com/kb/en |  |
| https://www.britbox.com/account | cancel:britbox | 200 | yes | https://account.britbox.com/signin?callback=https%3a%2f%2fwww.britbox.com%2fus%2faccount%2flogincallback%3freturnURL%3d%252faccount&country=us&geo=us&deviceName=other&deviceType=desktop_web&modelNo=other_version...&serialNo=56bdc832-22fc-44f8-b564-3dc6909d936b&exp=1791250089&key=a212bdfbde1936952f13d78c322078a24abe21b3340e46ebe886013763d8ee2f45bd6c19c3069c5ef9c87b4209d553e8c40171991b9912e9aed05af43ed6bba6 | redirects to sign-in |
| https://help.britbox.com/hc/en-us | cancel:britbox | 403 | no | https://help.britbox.com/hc/en-us | 403 refused (possible bot wall); not retried |
| https://www.dazn.com/en-US/account | cancel:dazn | 200 | yes | https://www.dazn.com/en-US/account |  |
| https://support.dazn.com/hc/en-us | cancel:dazn | 0 | no | https://support.dazn.com/hc/en-us | no response: ENOTFOUND |
| https://www.discoveryplus.com/account | cancel:discovery-plus | 200 | yes | https://auth.discoveryplus.com/my-account |  |
| https://help.discoveryplus.com/ | cancel:discovery-plus | 200 | yes | https://help.discoveryplus.com/hc/en-us |  |
| https://www.spotify.com/account/subscription/ | cancel:spotify | 200 | yes | https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fwww.spotify.com%2Fus%2Faccount%2Foverview%2F | redirects to sign-in |
| https://support.spotify.com/us/article/cancel-premium/ | cancel:spotify | 200 | yes | https://support.spotify.com/us/article/cancel-premium/ |  |
| https://music.apple.com/account | cancel:apple-music | 200 | yes | https://finance-app.itunes.apple.com/account |  |
| https://support.google.com/youtubemusic/ | cancel:youtube-music | 200 | yes | https://support.google.com/youtubemusic/ |  |
| https://www.amazon.com/music/unlimited | cancel:amazon-music | 200 | yes | https://www.amazon.com/music/unlimited |  |
| https://www.amazon.com/gp/help/customer/display.html?nodeId=GLQP8385T78LUERA | cancel:amazon-music | 200 | yes | https://www.amazon.com/gp/help/customer/display.html?nodeId=GLQP8385T78LUERA |  |
| https://www.pandora.com/account/subscription | cancel:pandora | 200 | yes | https://www.pandora.com/account/subscription |  |
| https://help.pandora.com/ | cancel:pandora | 200 | yes | https://help.pandora.com/s/?language=en_US |  |
| https://www.siriusxm.com/manage/ | cancel:siriusxm | 200 | yes | https://www.siriusxm.com/help/manage-or-cancel-service |  |
| https://www.siriusxm.com/help/manage-or-cancel-service | cancel:siriusxm | 200 | yes | https://www.siriusxm.com/help/manage-or-cancel-service |  |
| https://tidal.com/account | cancel:tidal | 403 | no | https://tidal.com/account | 403 refused (possible bot wall); not retried |
| https://support.tidal.com/hc/en-us | cancel:tidal | 403 | no | https://support.tidal.com/hc/en-us | 403 refused (possible bot wall); not retried |
| https://www.audible.com/account/membership | cancel:audible | 404 | no | https://www.audible.com/account/membership | 404 not found |
| https://www.audible.com/help | cancel:audible | 200 | yes | https://help.audible.com/s/?language=en_US |  |
| https://www.amazon.com/kindle-dbs/subscribe/kuhome | cancel:kindle-unlimited | 404 | no | https://www.amazon.com/kindle-dbs/subscribe/kuhome | 404 not found |
| https://www.amazon.com/gp/help/customer/display.html?nodeId=201974040 | cancel:kindle-unlimited | 200 | yes | https://www.amazon.com/gp/help/customer/display.html?nodeId=201974040 |  |
| https://myaccount.nytimes.com/seg/subscription | cancel:nytimes | 200 | yes | https://www.nytimes.com/account/subscription |  |
| https://help.nytimes.com/hc/en-us/articles/115014925468 | cancel:nytimes | 200 | yes | https://help.nytimes.com/ |  |
| https://customercenter.wsj.com/ | cancel:wsj | 200 | yes | https://customercenter.wsj.com/public |  |
| https://customercenter.wsj.com/view/help-center | cancel:wsj | 200 | yes | https://customercenter.wsj.com/view/help-center |  |
| https://subscribe.washingtonpost.com/profile/ | cancel:washington-post | 0 | no | https://subscribe.washingtonpost.com/profile/ | no response: ERR_HTTP2_STREAM_ERROR |
| https://helpcenter.washingtonpost.com/hc/en-us | cancel:washington-post | 403 | no | https://helpcenter.washingtonpost.com/hc/en-us | 403 refused (possible bot wall); not retried |
| https://www.theatlantic.com/membership/ | cancel:the-atlantic | 403 | no | https://www.theatlantic.com/membership/ | 403 refused (possible bot wall); not retried |
| https://www.theatlantic.com/help/ | cancel:the-atlantic | 403 | no | https://www.theatlantic.com/help/ | 403 refused (possible bot wall); not retried |
| https://medium.com/me/settings/membership | cancel:medium | 403 | no | https://medium.com/me/settings/membership | 403 refused (possible bot wall); not retried |
| https://help.medium.com/hc/en-us | cancel:medium | 403 | no | https://help.medium.com/hc/en-us | 403 refused (possible bot wall); not retried |
| https://tinder.com/app/account | cancel:tinder | 200 | yes | https://tinder.com/app/account |  |
| https://www.help.tinder.com/hc/en-us/articles/115003479523 | cancel:tinder | 403 | no | https://www.help.tinder.com/hc/en-us/articles/115003479523 | 403 refused (possible bot wall); not retried |
| https://bumble.com/web-not-available/ | cancel:bumble | 200 | yes | https://bumble.com/web-not-available/ |  |
| https://help.hinge.co/hc/en-us | cancel:hinge | 403 | no | https://help.hinge.co/hc/en-us | 403 refused (possible bot wall); not retried |
| https://www.match.com/help | cancel:match | 403 | no | https://www.match.com/help | 403 refused (possible bot wall); not retried |
| https://account.microsoft.com/services | cancel:xbox-game-pass | 200 | yes | https://login.microsoftonline.com/common/oauth2/v2.0/authorize?scope=https:%2F%2Faccount.microsoft.com%2FMBI%20openid%20profile%20offline_access&response_type=code&client_id=81feaced-5ddd-41e7-8bef-3e20a2689bb7&redirect_uri=https:%2F%2Faccount.microsoft.com%2Fauth%2Fcomplete-signin-oauth&client-request-id=47c9f825-fd11-44a4-a399-534c3a2e247b&x-client-SKU=MSAL.Desktop&x-client-Ver=4.83.1.0&prompt=login&client_info=1&state=H4sIAAAAAAAEAAXByYJDMAAA0H_p1cFSQ3qkpktIBUH1RqwtOrQi8vXz3s4SdQsuiaSP8XiKzTuofKa1ZEkhUs_MrvJljReFJtsf0V1pa3NLfDhcs96TVA2n_GgL4QLj_HYzrh9cSvAh7X5ZVCcOC62uEhjmEmr8J5zNr_MU_Bv5orKk7NZ4Ay7N2Nv0V_tHOTx5CKSZgZXjrBbCzN0fN4KJvqQBOBeGen-XWYTuYoyk5DyST_TrxoTWsqyFe2O4tfPAooLQi39bt_Y1GCiur_1qvhsMAPhasrSYt3J6zqdr8XD6x8G212CQebvgeLS8uHHtqV3XwiMBSMC3M9H7NCzqTwfYIaz9kOa0DPCFkyZFk8-qMZq3YYbEoQxpphj32BuT_gU9LviEyyHt1r1UzLVWKhN_BDIAyjilFkaho5QfmLmsJ6io6O4fZlxM3IIBAAA&msaoauth2=true&instance_aware=true&lc=1033 | ends on login.microsoftonline.com, not an entry domain |
| https://support.xbox.com/en-US/help/subscriptions-billing/manage-payment-subscriptions/cancel-xbox-subscription | cancel:xbox-game-pass | 200 | yes | https://support.xbox.com/en-US/help/subscriptions-billing/manage-payment-subscriptions/cancel-xbox-subscription |  |
| https://www.playstation.com/en-us/support/subscriptions/ | cancel:playstation-plus | 200 | yes | https://www.playstation.com/en-us/support/subscriptions/ |  |
| https://accounts.nintendo.com/ | cancel:nintendo-switch-online | 0 | no | https://accounts.nintendo.com/ | no response: timed out after 20 s |
| https://en-americas-support.nintendo.com/app/answers/detail/a_id/27745 | cancel:nintendo-switch-online | 406 | no | https://en-americas-support.nintendo.com/app/utils/login_form/redirect/answers%252Fdetail%252Fa_id%252F27745/session/L2F2LzEvdGltZS8xNzkxMTYzNzcwL2dlbi8xNzkxMTYzNzcwL3NpZC9mVW9iREZWUUZyUEtwUE1sTFpyZ1R6QWhBdjZ1ck85bkJCbG5nZWEweDgxaDNDT254VTIlN0VwR0RRVjY4YWtsZ0E0X29CeU5HYUExelJyMUE1eWVkRDFlVV9VakptZXJyOEh0RFdBX25XQjN0ZmhIUzRDTFVheUtpZyUyMSUyMQ==?p_ptaid=fUxbnqwwjciorbgrcLkFTmo_e8Q2ulFAEjAop3dZIPLMMEJonk%7ENf2ORztBzmJms3Gyayds7oTCTafNffErftXiHhOFt0nqpA81Z%7EeqIamnxuDR2JLjlPJYA%21%21 | 406 not acceptable to this agent; not retried |
| https://support.discord.com/hc/en-us/articles/115001177731 | cancel:discord-nitro | 403 | no | https://support.discord.com/hc/en-us/articles/115001177731 | 403 refused (possible bot wall); not retried |
| https://www.twitch.tv/subscriptions | cancel:twitch | 200 | yes | https://www.twitch.tv/subscriptions |  |
| https://help.twitch.tv/s/ | cancel:twitch | 200 | yes | https://help.twitch.tv/s/?language=en_US |  |
| https://help.ea.com/en/help/account/cancel-ea-play/ | cancel:ea-play | 0 | no | https://help.ea.com/en/help/account/cancel-ea-play/ | no response: ERR_HTTP2_STREAM_ERROR |
| https://www.roblox.com/my/account#!/subscriptions | cancel:roblox | 200 | yes | https://www.roblox.com/NewLogin?ReturnUrl=%2Fmy%2Faccount | redirects to sign-in |
| https://en.help.roblox.com/hc/en-us/articles/203312800 | cancel:roblox | 403 | no | https://en.help.roblox.com/hc/en-us/articles/203312800 | 403 refused (possible bot wall); not retried |
| https://apps.apple.com/account/subscriptions | cancel:apple | 200 | yes | https://account.apple.com/account/manage/section/subscriptions |  |
| https://play.google.com/store/account/subscriptions | cancel:google-play | 200 | yes | https://accounts.google.com/v3/signin/identifier?continue=https://play.google.com/store/account/subscriptions&followup=https://play.google.com/store/account/subscriptions&osid=1&passive=1209600&flowName=WebLiteSignIn&flowEntry=ServiceLogin&dsh=S840146775:1791163784194459 | redirects to sign-in |
| https://support.google.com/googleplay/answer/7018481 | cancel:google-play | 200 | yes | https://support.google.com/googleplay/answer/7018481 |  |
| https://www.paypal.com/myaccount/autopay/ | cancel:paypal | 200 | yes | https://www.paypal.com/signin?returnUri=https%3A%2F%2Fwww.paypal.com%2Fmyaccount%2Fautopay&state=%2F | redirects to sign-in |
| https://my.roku.com/account/subscriptions | cancel:roku | 200 | yes | https://my.roku.com/account/subscriptions |  |
| https://support.roku.com/en-us | cancel:roku | 200 | yes | https://support.roku.com/en-us |  |
| https://www.amazon.com/mn/dcw/myx.html | cancel:amazon-channels | 200 | yes | https://www.amazon.com/ax/claim?arb=0ed48d4c-768b-4554-813c-882abd05c40b |  |
| https://www.amazon.com/gp/help/customer/display.html?nodeId=202095260 | cancel:amazon-channels | 200 | yes | https://www.amazon.com/gp/help/customer/display.html?nodeId=202095260 |  |
| https://account.apple.com/account/manage/section/subscriptions | cancel:icloud, cancel:applecare | 200 | yes | https://account.apple.com/account/manage/section/subscriptions |  |
| https://one.google.com/storage | cancel:google-one | 200 | yes | https://accounts.google.com/v3/signin/identifier?continue=https://one.google.com/storage&followup=https://one.google.com/storage&passive=1209600&flowName=WebLiteSignIn&flowEntry=ServiceLogin&dsh=S-1761012842:1791163802004929 | redirects to sign-in |
| https://support.google.com/googleone/answer/9004133 | cancel:google-one | 404 | no | https://support.google.com/googleone/answer/9004133 | 404 not found |
| https://www.dropbox.com/account/plan | cancel:dropbox | 200 | yes | https://www.dropbox.com/login?cont=%2Faccount%2Fplan | redirects to sign-in |
| https://help.dropbox.com/billing/cancel-plan | cancel:dropbox | 404 | no | https://help.dropbox.com/billing/cancel-plan | 404 not found |
| https://account.microsoft.com/services/microsoft365 | cancel:microsoft-365 | 200 | yes | https://login.microsoftonline.com/common/oauth2/v2.0/authorize?scope=https:%2F%2Faccount.microsoft.com%2FMBI%20openid%20profile%20offline_access&response_type=code&client_id=81feaced-5ddd-41e7-8bef-3e20a2689bb7&redirect_uri=https:%2F%2Faccount.microsoft.com%2Fauth%2Fcomplete-signin-oauth&client-request-id=cea2291d-25fa-447f-9301-dcecaeffa520&x-client-SKU=MSAL.Desktop&x-client-Ver=4.83.1.0&prompt=login&client_info=1&state=H4sIAAAAAAAEAAXBSWKCMAAAwL_0ysGAKOSIbEIpQsGw3BKWsISWRIyW13fmAyFcP14ZCb1Oc4HaQ98NxzB3Jy-1LuPhkIwwM_eEGxYD7CJY1LpiqsN2fdf0Ve_-kW2pctpUNeis9QRWGktG8zqr57wj2y9B5uj5I8AZEtXB4Z4nU714UF0zYHKgw4U3INUK_BMqc7nYe-M2-3QWzJ5ukSwvuOuCaAK9ooBAs9OdwABDzs-NRZquBbG9JJ_LggPDz5iIviW60na-F6g86aqDmrV_7q4UKaz0oenzja7BlYwO5pXG2t92Xe_kWzizkVWFjEcLYbvPuSi3ocrM48KzGzz_fba3XTvfHPyYY1IwqBxb0-9cNjR3403j1xJtZQLk8_neua-eiGt-fW1mfvyBeARPfpWirxYPeoDOSj6gxwbFRN6O1KGiSwV__APJirtHggEAAA&msaoauth2=true&instance_aware=true&lc=1033 | ends on login.microsoftonline.com, not an entry domain |
| https://support.microsoft.com/en-us/accounts-billing/subscriptions/cancel-a-microsoft-365-subscription | cancel:microsoft-365 | 200 | yes | https://support.microsoft.com/en-us/accounts-billing/subscriptions/cancel-a-microsoft-365-subscription |  |
| https://account.adobe.com/plans | cancel:adobe | 200 | yes | https://account.adobe.com/plans |  |
| https://helpx.adobe.com/manage-account/using/cancel-subscription-online.html | cancel:adobe | 403 | no | https://helpx.adobe.com/manage-account/using/cancel-subscription-online.html | 403 refused (possible bot wall); not retried |
| https://www.canva.com/settings/billing | cancel:canva | 403 | no | https://www.canva.com/settings/billing | 403 refused (possible bot wall); not retried |
| https://www.canva.com/help/cancel-subscription/ | cancel:canva | 403 | no | https://www.canva.com/help/cancel-subscription/ | 403 refused (possible bot wall); not retried |
| https://my.1password.com/ | cancel:one-password | 200 | yes | https://my.1password.com/ |  |
| https://support.1password.com/cancel-account/ | cancel:one-password | 403 | no | https://support.1password.com/cancel-account/ | 403 refused (possible bot wall); not retried |
| https://support.lastpass.com/s/document-item?language=en_US&bundleId=lastpass&topicId=LastPass%2Fcancel-premium-plan.html | cancel:lastpass | 0 | no | https://support.lastpass.com/s/document-item?language=en_US&bundleId=lastpass&topicId=LastPass%2Fcancel-premium-plan.html | no response: UNABLE_TO_VERIFY_LEAF_SIGNATURE |
| https://my.nordaccount.com/billing/ | cancel:nordvpn | 403 | no | https://my.nordaccount.com/billing/ | 403 refused (possible bot wall); not retried |
| https://nordvpn.com/blog/nordvpn-cancellation-and-refund-process/ | cancel:nordvpn | 403 | no | https://nordvpn.com/blog/nordvpn-cancellation-and-refund-process/ | 403 refused (possible bot wall); not retried |
| https://www.expressvpn.com/subscriptions | cancel:expressvpn | 200 | yes | https://portal.expressvpn.com/api/auth/login/init?returnUrl=b64.L215LXN1YnNjcmlwdGlvbg | redirects to sign-in |
| https://www.expressvpn.com/support/manage-account/cancel-expressvpn-subscription/ | cancel:expressvpn | 200 | yes | https://www.expressvpn.com/support/manage-account/cancel-expressvpn-subscription/ |  |
| https://login.norton.com/ | cancel:norton | 403 | no | https://login.norton.com/ | 403 refused (possible bot wall); not retried |
| https://support.norton.com/sp/en/us/home/current/solutions/v3672523 | cancel:norton | 404 | no | https://support.norton.com/sp/en/us/home/current/solutions/v3672523 | 404 not found |
| https://www.mcafee.com/myaccount/ | cancel:mcafee | 0 | no | https://www.mcafee.com/myaccount/ | no response: ERR_HTTP2_STREAM_ERROR |
| https://www.mcafee.com/support/ | cancel:mcafee | 0 | no | https://www.mcafee.com/support/ | no response: ERR_HTTP2_STREAM_ERROR |
| https://chatgpt.com/settings | cancel:chatgpt | 403 | no | https://chatgpt.com/settings | 403 refused (possible bot wall); not retried |
| https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription | cancel:chatgpt | 0 | no | https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription | no response: ENOTFOUND |
| https://claude.ai/settings/billing | cancel:claude | 403 | no | https://claude.ai/settings/billing | 403 refused (possible bot wall); not retried |
| https://support.claude.com/en/ | cancel:claude | 200 | yes | https://support.claude.com/en/ |  |
| https://www.notion.so/my-account | cancel:notion | 200 | yes | https://app.notion.com/space/my-account |  |
| https://www.notion.com/help/cancel-your-subscription | cancel:notion | 404 | no | https://www.notion.com/help/cancel-your-subscription | 404 not found |
| https://zoom.us/account/billing | cancel:zoom | 200 | yes | https://zoom.us/signin | redirects to sign-in |
| https://support.zoom.us/hc/en-us/articles/4405333397261-Zoom-billing-support | cancel:zoom | 200 | yes | https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0066832 |  |
| https://github.com/settings/billing/summary | cancel:github | 200 | yes | https://github.com/login?return_to=https%3A%2F%2Fgithub.com%2Fsettings%2Fbilling%2Fsummary | redirects to sign-in |
| https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-plan/cancel | cancel:github | 200 | yes | https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-plan/cancel |  |
| https://www.duolingo.com/settings/super | cancel:duolingo | 200 | yes | https://www.duolingo.com/settings/super |  |
| https://www.duolingo.com/help | cancel:duolingo | 200 | yes | https://www.duolingo.com/help |  |
| https://www.linkedin.com/premium/manage/ | cancel:linkedin-premium | 200 | yes | https://www.linkedin.com/uas/login?session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpremium%2Fmanage%2F | redirects to sign-in |
| https://www.linkedin.com/help/linkedin/answer/a545578 | cancel:linkedin-premium | 200 | yes | https://www.linkedin.com/help/linkedin/answer/a545578 |  |
| https://www.patreon.com/settings/memberships | cancel:patreon | 403 | no | https://www.patreon.com/login?ru=https%3A%2F%2Fwww.patreon.com%2Fsettings%2Fmemberships | 403 refused (possible bot wall); not retried |
| https://support.patreon.com/hc/en-us/articles/27204042141837-Canceling-a-free-membership | cancel:patreon | 403 | no | https://support.patreon.com/hc/en-us/articles/27204042141837-Canceling-a-free-membership | 403 refused (possible bot wall); not retried |
| https://members.onepeloton.com/ | cancel:peloton | 200 | yes | https://members.onepeloton.com/home/ |  |
| https://support.onepeloton.com/hc/en-us | cancel:peloton | 200 | yes | https://support.onepeloton.com/s/?language=en_US |  |
| https://www.planetfitness.com/my-account | cancel:planet-fitness | 403 | no | https://www.planetfitness.com/my-account | 403 refused (possible bot wall); not retried |
| https://www.planetfitness.com/faq | cancel:planet-fitness | 403 | no | https://www.planetfitness.com/faq | 403 refused (possible bot wall); not retried |
| https://www.strava.com/settings | cancel:strava | 200 | yes | https://www.strava.com/login | redirects to sign-in |
| https://support.strava.com/hc/en-us | cancel:strava | 200 | yes | https://support.strava.com/en-us/collections/19657601-getting-started |  |
| https://www.headspace.com/subscription/manage | cancel:headspace | 200 | yes | https://my.headspace.com/profile/subscription/manage |  |
| https://help.headspace.com/hc/en-us/articles/115008364988-How-do-I-cancel-my-subscription | cancel:headspace | 403 | no | https://help.headspace.com/hc/en-us/articles/115008364988-How-do-I-cancel-my-subscription | 403 refused (possible bot wall); not retried |
| https://www.calm.com/profile | cancel:calm | 200 | yes | https://www.calm.com/app/profile |  |
| https://support.calm.com/hc/en-us/articles/115002473607-How-to-cancel-my-subscription | cancel:calm | 403 | no | https://support.calm.com/hc/en-us/articles/115002473607-How-to-cancel-my-subscription | 403 refused (possible bot wall); not retried |
| https://web.noom.com/ | cancel:noom | 403 | no | https://www.noom.com/ | 403 refused (possible bot wall); not retried |
| https://web.noom.com/support | cancel:noom | 403 | no | https://www.noom.com/support | 403 refused (possible bot wall); not retried |
| https://support.myfitnesspal.com/hc/en-us | cancel:myfitnesspal | 403 | no | https://support.myfitnesspal.com/hc/en-us | 403 refused (possible bot wall); not retried |
| https://classpass.com/account/settings | cancel:classpass | 403 | no | https://classpass.com/account/settings | 403 refused (possible bot wall); not retried |
| https://help.classpass.com/hc/en-us/articles/204578119 | cancel:classpass | 403 | no | https://help.classpass.com/hc/en-us/articles/204578119 | 403 refused (possible bot wall); not retried |
| https://app.whoop.com/membership | cancel:whoop | 403 | no | https://app.whoop.com/membership | 403 refused (possible bot wall); not retried |
| https://www.community.whoop.com/t/how-do-i-cancel-membership/13635 | cancel:whoop | 200 | yes | https://www.community.whoop.com/t/how-do-i-cancel-membership/13635 |  |
| https://support.google.com/store/answer/14237941 | cancel:fitbit-premium | 200 | yes | https://support.google.com/store/answer/14237941 |  |
| https://www.amazon.com/gp/primecentral | cancel:amazon-prime | 200 | yes | https://www.amazon.com/ax/claim?arb=cbcd80b2-5e3c-4bd8-8b07-d61dd481c3fc |  |
| https://www.amazon.com/gp/help/customer/display.html?nodeId=GTS2W2WH9STCUUMK | cancel:amazon-prime | 200 | yes | https://www.amazon.com/gp/help/customer/display.html?nodeId=GTS2W2WH9STCUUMK |  |
| https://www.walmart.com/plus/manage | cancel:walmart-plus | 200 | yes | https://www.walmart.com/plus/manage |  |
| https://www.walmart.com/help | cancel:walmart-plus | 200 | yes | https://www.walmart.com/help |  |
| https://www.doordash.com/dashpass/ | cancel:doordash-dashpass | 403 | no | https://www.doordash.com/dashpass/ | 403 refused (possible bot wall); not retried |
| https://help.doordash.com/en-us/consumers/article/how-do-i-cancel-my-dashpass-subscription | cancel:doordash-dashpass | 200 | yes | https://help.doordash.com/en-us/consumers/article/how-do-i-cancel-my-dashpass-subscription |  |
| https://www.uber.com/us/en/member/uber-one/ | cancel:uber-one | 404 | no | https://www.uber.com/us/en/member/uber-one/ | 404 not found |
| https://help.uber.com/riders | cancel:uber-one | 200 | yes | https://help.uber.com/riders |  |
| https://www.instacart.com/help | cancel:instacart-plus | 200 | yes | https://www.instacart.com/help |  |
| https://www.grubhub.com/account/subscription | cancel:grubhub-plus | 200 | yes | https://www.grubhub.com/account/subscription |  |
| https://customerservice.costco.com/app/answers/detail/a_id/1085 | cancel:costco | 200 | yes | https://customerservice.costco.com/app/error/error_id/1 |  |
| https://help.samsclub.com/?xid=vanity:help | cancel:sams-club | 200 | yes | https://help.samsclub.com/?xid=vanity:help |  |
| https://support.hellofresh.com/ | cancel:hellofresh | 0 | no | https://support.hellofresh.com/ | no response: ENOTFOUND |
| https://support.factor75.com/ | cancel:factor | 0 | no | https://support.factor75.com/ | no response: ENOTFOUND |
| https://www.target.com/account/memberships | cancel:target-circle-360 | 200 | yes | https://www.target.com/account/memberships |  |
| https://help.target.com/ | cancel:target-circle-360 | 200 | yes | https://www.target.com/help |  |
| https://www.chewy.com/help | cancel:chewy | 200 | yes | https://www.chewy.com/customer-care |  |
| https://account.ring.com/account/protect-plans | cancel:ring | 200 | yes | https://ring.com/users/sign_in?return=account&path=%2Faccount%2Fprotect-plans |  |
| https://ring.com/support/articles/468y0/Canceling-your-Ring-plan | cancel:ring | 200 | yes | https://ring.com/support/articles/468y0/Canceling-your-Ring-plan |  |
| https://support.simplisafe.com/ | cancel:simplisafe | 200 | yes | https://support.simplisafe.com/ |  |
| https://www.adt.com/myadt | cancel:adt | 403 | no | https://www.adt.com/myadt | 403 refused (possible bot wall); not retried |
| https://www.adt.com/help | cancel:adt | 403 | no | https://www.adt.com/help | 403 refused (possible bot wall); not retried |
| https://support.apple.com/en-us/101726 | cancel:applecare | 200 | yes | https://support.apple.com/en-us/101726 |  |
| https://help.aura.com/s/article/cancel-subscription-online | cancel:aura | 200 | yes | https://help.aura.com/s/article/cancel-subscription-online |  |
| https://my.norton.com/ | cancel:lifelock | 403 | no | https://my.norton.com/ | 403 refused (possible bot wall); not retried |
| https://www.experian.com/consumer/membership.html | cancel:experian | 404 | no | https://www.experian.com/consumer/membership.html | 404 not found |
| https://support.life360.com/hc/en-us/articles/23053539274135 | cancel:life360 | 403 | no | https://support.life360.com/hc/en-us/articles/23053539274135 | 403 refused (possible bot wall); not retried |
| https://www.ancestry.com/account/ | cancel:ancestry | 403 | no | https://www.ancestry.com/account/signin?returnUrl=https%3A%2F%2Fwww.ancestry.com%2Faccount | 403 refused (possible bot wall); not retried |
| https://support.ancestry.com/s/article/Canceling-Your-Subscription | cancel:ancestry | 200 | yes | https://help.ancestry.com/hc/en-us |  |
| https://www.verizon.com/myverizon/ | cancel:verizon | 200 | yes | https://secure.verizon.com/signin | redirects to sign-in |
| https://www.verizon.com/support/ | cancel:verizon | 200 | yes | https://www.verizon.com/support/ |  |
| https://www.t-mobile.com/my-t-mobile | cancel:t-mobile | 403 | no | https://www.t-mobile.com/my-t-mobile | 403 refused (possible bot wall); not retried |
| https://www.t-mobile.com/support/account/cancel-service | cancel:t-mobile | 403 | no | https://www.t-mobile.com/support/account/cancel-service | 403 refused (possible bot wall); not retried |
| https://www.att.com/my/ | cancel:att | 200 | yes | https://www.att.com/my/ |  |
| https://www.att.com/support/article/wireless/KM1031426/ | cancel:att | 200 | yes | https://www.att.com/support/article/wireless/KM1031426/ |  |
| https://www.americanexpress.com/us/customer-service/faq.download-export-transactions-software.html | formats:amex | 200 | yes | https://www.americanexpress.com/us/customer-service/faq.download-export-transactions-software.html |  |
| https://usbank.com/customer-service/knowledge-base/KB0069323.html | formats:usbank | 200 | yes | https://www.usbank.com/customer-service/knowledge-base/KB0069323.html |  |
| https://support.apple.com/en-us/102284 | formats:apple-card | 200 | yes | https://support.apple.com/en-us/102284 |  |
| https://developer.paypal.com/docs/reports/online-reports/activity-download/ | formats:paypal | 200 | yes | https://developer.paypal.com/reports/activity-download |  |
| https://help.venmo.com/hc/en-us/articles/360016096974-Transaction-History | formats:venmo | 200 | yes | https://help.venmo.com/cs/articles/transaction-history-vhel281 |  |
| https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9.md | formats:ynab | 200 | yes | https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9.md |  |
