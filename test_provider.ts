import fs from 'fs';
import path from 'path';
import { TruyenHdaProvider } from './providers/TruyenHdaProvider';

async function test() {
    const provider = new TruyenHdaProvider();
    const htmlPath = path.join(__dirname, 'providers', 'truyenhd.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Mock fetchChapter to use local HTML
    // @ts-ignore
    provider.fetchChapter = async (url: string) => {
        // @ts-ignore
        const titleMatch = html.match(/<h1[^>]*class="text-center"[^>]*>(.*?)<span/is) ||
            html.match(/<h1[^>]*class="text-center"[^>]*>(.*?)<\/h1>/is) ||
            html.match(/<title>(.*?)<\/title>/is);
        // @ts-ignore
        const title = provider.cleanHtml(titleMatch[1]);

        // @ts-ignore
        const breadcrumbMatches = html.match(/<li[^>]*class="breadcrumb-item"[^>]*>.*?<a[^>]*>(.*?)<\/a>.*?<\/li>/gi);
        let novelTitle;
        if (breadcrumbMatches && breadcrumbMatches.length >= 2) {
            const novelBreadcrumb = breadcrumbMatches[breadcrumbMatches.length - 2];
            const innerMatch = novelBreadcrumb.match(/<a[^>]*>(.*?)<\/a>/i);
            if (innerMatch) {
                // @ts-ignore
                novelTitle = provider.cleanHtml(innerMatch[1]);
            }
        }

        const contentMatch = html.match(/<div[^>]*class="reading"[^>]*>(.*?)<\/div>\s*<div[^>]*class="[^"]*user-interact/is) ||
            html.match(/<div[^>]*class="reading"[^>]*>(.*?)<\/div>\s*<div[^>]*class="[^"]*pagination/is) ||
            html.match(/<div[^>]*class="reading"[^>]*>(.*?)<\/div>/is);
        // @ts-ignore
        let content = contentMatch[1];
        content = content.replace(/<[^>]+>/g, ' ');
        // @ts-ignore
        content = provider.decodeHtmlEntities(content);
        content = content.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

        const nextMatch = html.match(/<div[^>]*class="next-chap next-chap-2"[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>/is);
        const prevMatch = html.match(/<div[^>]*class="next-chap next-chap-1"[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>/is);

        return {
            title,
            novelTitle,
            content: content.substring(0, 100) + '...',
            nextChapterUrl: nextMatch ? nextMatch[1] : undefined,
            prevChapterUrl: prevMatch ? prevMatch[1] : undefined,
        };
    };

    const result = await provider.fetchChapter('https://truyenhda.com/truyen/test');
    console.log('Test Result:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
