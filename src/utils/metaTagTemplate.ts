interface MetaData {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  site_name: string;
}

export const generateMetaHTML = (metadata: MetaData): string => {
  const escapedTitle = metadata.title.replace(/"/g, "&quot;");
  const escapedDescription = metadata.description.replace(/"/g, "&quot;");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapedTitle}</title>

    <!-- Primary Meta Tags -->
    <meta name="title" content="${escapedTitle}">
    <meta name="description" content="${escapedDescription}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${metadata.type}">
    <meta property="og:url" content="${metadata.url}">
    <meta property="og:title" content="${escapedTitle}">
    <meta property="og:description" content="${escapedDescription}">
    <meta property="og:image" content="${metadata.image}">
    <meta property="og:site_name" content="${metadata.site_name}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${metadata.url}">
    <meta name="twitter:title" content="${escapedTitle}">
    <meta name="twitter:description" content="${escapedDescription}">
    <meta name="twitter:image" content="${metadata.image}">

    <!-- Structured Data -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "${escapedTitle}",
        "description": "${escapedDescription}",
        "image": "${metadata.image}",
        "url": "${metadata.url}",
        "publisher": {
          "@type": "Organization",
          "name": "${metadata.site_name}"
        }
      }
    </script>
</head>
<body>
    <h1>${escapedTitle}</h1>
    <p>${escapedDescription}</p>
    <img src="${metadata.image}" alt="${escapedTitle}">
    <p><a href="${metadata.url}">Read full article</a></p>
</body>
</html>
  `.trim();
};
