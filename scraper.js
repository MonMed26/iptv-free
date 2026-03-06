const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

chromium.use(stealth);

const channels = [
    { name: 'RCTI', url: 'https://www.rctiplus.com/tv/rcti', id: 'RCTI.id' },
    { name: 'MNCTV', url: 'https://www.rctiplus.com/tv/mnctv', id: 'MNCTV.id' },
    { name: 'GTV', url: 'https://www.rctiplus.com/tv/gtv', id: 'GTV.id' },
    { name: 'iNews', url: 'https://www.rctiplus.com/tv/inews', id: 'iNews.id' }
];

(async () => {
    console.log('Starting Scraper...');
    const browser = await chromium.launch({ headless: true });

    let results = {};

    for (const channel of channels) {
        console.log(`\nScraping ${channel.name}...`);
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();

        // Block media and images to speed up loading
        await page.route('**/*', route => {
            const type = route.request().resourceType();
            if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        let m3u8Url = null;
        const m3u8Promise = new Promise(resolve => {
            page.on('request', request => {
                const url = request.url();
                if (url.includes('.m3u8') && url.includes('auth_key')) {
                    m3u8Url = url;
                    resolve();
                }
            });
        });

        try {
            await page.goto(channel.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await Promise.race([
                m3u8Promise,
                page.waitForTimeout(15000)
            ]);
        } catch (e) {
            console.error(`Error navigating to ${channel.name}:`, e.message);
        }

        if (m3u8Url) {
            console.log(`Found URL for ${channel.name}: ${m3u8Url}`);
            results[channel.id] = m3u8Url;
        } else {
            console.log(`FAILED to get URL for ${channel.name}`);
        }
        await context.close();
    }

    await browser.close();

    console.log('\n--- Scraping Complete ---');
    console.log(results);

    // Update channel-free.m3u
    const m3uFile = 'channel-free.m3u';
    let m3uContent = '';

    if (!fs.existsSync(m3uFile)) {
        console.log(`\nFile ${m3uFile} not found locally! Creating base file from template...`);
        m3uContent = `#EXTM3U
#EXTINF:-1 tvg-id="Trans7.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/Logo_Trans7.png" group-title="General",Trans7
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0
https://video.detik.com/trans7/smil:trans7/playlist.m3u8

#EXTINF:-1 tvg-id="TransTV.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/Logo_Trans_TV.png" group-title="General",Trans TV
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0
https://video.detik.com/transtv/smil:transtv/index.m3u8

#EXTINF:-1 tvg-id="SCTV.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/512px-SCTV_Logo.svg.png" http-referrer="https://www.dens.tv/" http-user-agent="Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36" group-title="General",SCTV
#EXTVLCOPT:http-referrer=https://www.dens.tv/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36
https://op-group1-swiftservehd-1.dens.tv/h/h217/index.m3u8

#EXTINF:-1 tvg-id="Indosiar.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/512px-Logo_Indosiar_2015.svg.png" http-referrer="https://www.dens.tv/" http-user-agent="Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36" group-title="General",Indosiar
#EXTVLCOPT:http-referrer=https://www.dens.tv/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36
https://op-group1-swiftservehd-1.dens.tv/h/h235/index.m3u8

#EXTINF:-1 tvg-id="RTV.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/Rajawali_Televisi.svg.png" http-referrer="https://www.dens.tv/" http-user-agent="Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36" group-title="General",RTV
#EXTVLCOPT:http-referrer=https://www.dens.tv/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36
https://op-group1-swiftservehd-1.dens.tv/h/h10/01.m3u8

#EXTINF:-1 tvg-id="Moji.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/512px-Moji_blue.svg.png" http-referrer="https://www.dens.tv/" http-user-agent="Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36" group-title="General",Moji
#EXTVLCOPT:http-referrer=https://www.dens.tv/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36
https://op-group1-swiftservehd-1.dens.tv/h/h207/index.m3u8

#EXTINF:-1 tvg-id="MetroTV.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/LogoMetroTVsince2010.svg.png" group-title="General",Metro TV
https://edge.medcom.id/live-edge/smil:metro.smil/playlist.m3u8

#EXTINF:-1 tvg-id="tvOne.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/512px-TvOne_2023.svg.png" group-title="General",TV One
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36 http-user-agent=ExoPlayerDemo/2.15.1 (Linux; Android 13) ExoPlayerLib/2.15.1 
https://op-group1-swiftservehd-1.dens.tv/h/h40/01.m3u8

#EXTINF:-1 tvg-id="MNCTV.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/1024px-MNCTV_logo.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="General",MNCTV
#EXTVLCOPT:http-referrer=https://www.rctiplus.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
https://1s1.rctiplus.id/s-mnctv-sdi.m3u8?auth_key=REPLACE_ME
https://mnctv-cutv.rctiplus.id/mnctv-sdi.m3u8

#EXTINF:-1 tvg-id="RCTI.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/256px-RCTI_logo_2015.svg.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="General",RCTI
#EXTVLCOPT:http-referrer=https://www.rctiplus.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
https://1s1.rctiplus.id/anevia1/rcti-sdi.m3u8?auth_key=REPLACE_ME

#EXTINF:-1 tvg-id="GTV.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/500px-GTV_(2017).svg.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="General",GTV
#EXTVLCOPT:http-referrer=https://www.rctiplus.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
https://1s1.rctiplus.id/anevia3/gtv-sdi-avc1_800000=9-mp4a_96000=1.m3u8?auth_key=REPLACE_ME
https://gtv-cutv.rctiplus.id/gtv-sdi.m3u8

#EXTINF:-1 tvg-id="iNews.id" tvg-logo="https://raw.githubusercontent.com/MonMed26/iptv-free/refs/heads/main/logo/512px-INews.svg.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="General",iNews
#EXTVLCOPT:http-referrer=https://www.rctiplus.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
https://1s1.rctiplus.id/anevia3/inews-sdi.m3u8?auth_key=REPLACE_ME

#EXTINF:-1 tvg-id="ANTV.id" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Antv_logo.svg/1920px-Antv_logo.svg.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="General",ANTV
#EXTVLCOPT:http-referrer=https://www.rctiplus.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
https://raw.githubusercontent.com/Bluestraveller13/super-duper-spork/refs/heads/main/Trans7.m3u8
`;
    } else {
        m3uContent = fs.readFileSync(m3uFile, 'utf8');
    }
    const lines = m3uContent.split('\n');
    let newLines = [];
    let currentChannelId = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect which channel block we are in
        if (line.startsWith('#EXTINF:')) {
            currentChannelId = null;
            for (const ch of channels) {
                if (line.includes(`tvg-id="${ch.id}"`)) {
                    currentChannelId = ch.id;
                    break;
                }
            }
        }

        // If it's a URL line with auth_key and we are under a matched channel, replace it
        if (currentChannelId && line.startsWith('http') && line.includes('rctiplus') && line.includes('auth_key')) {
            if (results[currentChannelId]) {
                newLines.push(results[currentChannelId]);
                console.log(`Updated ${currentChannelId} with new URL.`);
            } else {
                // Formatting fallback in case scraper failed to get it
                newLines.push(line);
                console.log(`Warning: Preserving old URL for ${currentChannelId} because scraper failed.`);
            }
            currentChannelId = null; // Wait for next EXTINF
        } else {
            newLines.push(lines[i]); // keep original line (untrimmed to preserve structure)
        }
    }

    fs.writeFileSync(m3uFile, newLines.join('\n'));
    console.log(`\nSuccessfully saved updates to ${m3uFile}`);

})();



