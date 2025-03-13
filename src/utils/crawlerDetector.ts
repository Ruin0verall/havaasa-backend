export const isSocialMediaCrawler = (userAgent: string): boolean => {
  const crawlers = [
    "facebookexternalhit",
    "WhatsApp",
    "Twitterbot",
    "LinkedInBot",
    "Pinterest",
    "Slackbot",
    "TelegramBot",
  ];

  return crawlers.some((crawler) =>
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  );
};
