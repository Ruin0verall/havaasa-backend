interface MetaData {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  site_name: string;
}

export const generateMetaHTML = (metadata: MetaData): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.title}</title>

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${metadata.type}">
    <meta property="og:url" content="${metadata.url}">
    <meta property="og:title" content="${metadata.title}">
    <meta property="og:description" content="${metadata.description}">
    <meta property="og:image" content="${metadata.image}">
    <meta property="og:site_name" content="${metadata.site_name}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${metadata.title}">
    <meta name="twitter:description" content="${metadata.description}">
    <meta name="twitter:image" content="${metadata.image}">

    <meta name="description" content="${metadata.description}">
</head>
<body>
    <h1>${metadata.title}</h1>
    <p>${metadata.description}</p>
    <img src="${metadata.image}" alt="${metadata.title}">
</body>
</html>
  `.trim();
};
