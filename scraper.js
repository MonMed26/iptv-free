const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

chromium.use(stealth);

const channels = [
    { name: 'RCTI', url: 'https://m.rctiplus.com/tv/rcti', id: 'RCTI.id' },
    { name: 'MNCTV', url: 'https://m.rctiplus.com/tv/mnctv', id: 'MNCTV.id' },
    { name: 'GTV', url: 'https://m.rctiplus.com/tv/gtv', id: 'GTV.id' },
    { name: 'iNews', url: 'https://m.rctiplus.com/tv/inews', id: 'iNews.id' }
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
            page.on('response', async response => {
                const url = response.url();
                if (url.includes('/video/live/api/v1/live/') && url.includes('/url')) {
                    try {
                        const json = await response.json();
                        if (json && json.data && json.data.url) {
                            m3u8Url = json.data.url;
                            resolve();
                        }
                    } catch (e) {
                        // ignore parsing error
                    }
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
#EXTINF:-1 tvg-id="Trans7.id" tvg-logo="https://i.imgur.com/fAbGImS.png" group-title="Indonesia",Trans7
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0
https://video.detik.com/trans7/smil:trans7/playlist.m3u8

#EXTINF:-1 tvg-id="TransTV.id" tvg-logo="https://www.transtv.co.id/themes/v25.7/src/assets/logo/transtv-white.png" group-title="Indonesia",Trans TV
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0
https://video.detik.com/transtv/smil:transtv/index.m3u8

#EXTINF:-1 tvg-id="SCTV.id@SD" tvg-logo="https://i.imgur.com/EMmOvnQ.png" http-referrer="https://www.dens.tv/" http-user-agent="Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36" group-title="General",SCTV
#EXTVLCOPT:http-referrer=https://www.dens.tv/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36
https://op-group1-swiftservehd-1.dens.tv/h/h217/index.m3u8

#EXTINF:-1 tvg-id="Indosiar.id@SD" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Indosiar_2015.svg/512px-Indosiar_2015.svg.png" http-referrer="https://www.dens.tv/" http-user-agent="Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36" group-title="General",Indosiar
#EXTVLCOPT:http-referrer=https://www.dens.tv/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36
https://op-group1-swiftservehd-1.dens.tv/h/h235/index.m3u8

#EXTINF:-1 tvg-id="RTV.id@SD" tvg-logo="https://upload.wikimedia.org/wikipedia/id/thumb/5/5a/Rajawali_Televisi.svg/1920px-Rajawali_Televisi.svg.png" http-referrer="https://www.dens.tv/" http-user-agent="Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36" group-title="General",RTV
#EXTVLCOPT:http-referrer=https://www.dens.tv/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36
https://op-group1-swiftservehd-1.dens.tv/h/h10/01.m3u8

#EXTINF:-1 tvg-id="Moji.id@SD" tvg-logo="https://i.imgur.com/mM9zapJ.png" http-referrer="https://www.dens.tv/" http-user-agent="Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36" group-title="General",Moji
#EXTVLCOPT:http-referrer=https://www.dens.tv/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 Windows NT 10.0; Win64; x64 AppleWebKit/537.36 KHTML, like Gecko Chrome/144.0.0.0 Safari/537.36
https://op-group1-swiftservehd-1.dens.tv/h/h207/index.m3u8

#EXTINF:-1 tvg-id="MetroTV.id@SD" tvg-logo="https://i.imgur.com/QnU70NI.png" group-title="News",Metro TV
https://edge.medcom.id/live-edge/smil:metro.smil/playlist.m3u8

#EXTINF:-1 tvg-id="tvOne.id" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/TvOne_2023.svg/200px-TvOne_2023.svg.png" group-title="Indonesia",TV One
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36 http-user-agent=ExoPlayerDemo/2.15.1 (Linux; Android 13) ExoPlayerLib/2.15.1 
https://op-group1-swiftservehd-1.dens.tv/h/h40/01.m3u8

#EXTINF:-1 tvg-id="MNCTV.id" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/MNCTV_logo_2015.svg/960px-MNCTV_logo_2015.svg.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="Indonesia",MNCTV
#EXTVLCOPT:http-referrer=https://www.rctiplus.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
https://1s1.rctiplus.id/s-mnctv-sdi.m3u8?auth_key=REPLACE_ME
https://mnctv-cutv.rctiplus.id/mnctv-sdi.m3u8

#EXTINF:-1 tvg-id="RCTI.id" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/RCTI_logo_2015.svg/330px-RCTI_logo_2015.svg.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="Indonesia",RCTI
#EXTVLCOPT:http-referrer=https://www.rctiplus.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
https://1s1.rctiplus.id/anevia1/rcti-sdi.m3u8?auth_key=REPLACE_ME

#EXTINF:-1 tvg-id="GTV.id" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/GTV_%282017%29.svg/1920px-GTV_%282017%29.svg.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="Indonesia",GTV
#EXTVLCOPT:http-referrer=https://www.rctiplus.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
https://1s1.rctiplus.id/anevia3/gtv-sdi-avc1_800000=9-mp4a_96000=1.m3u8?auth_key=REPLACE_ME
https://gtv-cutv.rctiplus.id/gtv-sdi.m3u8

#EXTINF:-1 tvg-id="iNews.id" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/INews_2024.svg/512px-INews_2024.svg.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="Indonesia",iNews
#EXTVLCOPT:http-referrer=https://www.rctiplus.com/
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
https://1s1.rctiplus.id/anevia3/inews-sdi.m3u8?auth_key=REPLACE_ME

#EXTINF:-1 tvg-id="ANTV.id" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Antv_logo.svg/1920px-Antv_logo.svg.png" http-referrer="https://www.rctiplus.com/" http-user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" group-title="Indonesia",ANTV
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

        // If it's a URL line with auth_key or hdnts and we are under a matched channel, replace it
        if (currentChannelId && line.startsWith('http') && line.includes('rctiplus') && (line.includes('auth_key') || line.includes('hdnts'))) {
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
