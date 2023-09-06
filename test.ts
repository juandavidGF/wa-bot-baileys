import OpenAI from 'openai';
import isDomainAvailable from './utils/isDomainAvailable';


require('dotenv').config();


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getDomain() {
  let product = 'a generative AI brand'
  let companyName = "genAI"
  const domainCompletition = await openai.chat.completions.create({
    messages: [{ role: 'user', content: `What is a good web domain for a company that makes: ${product}?, and name ${companyName}, just responde with the domain not add more text, 
    and different than ` }],
    model: 'gpt-3.5-turbo',
  });
  const domain = domainCompletition.choices[0].message.content
  if(!domain) return
  console.log(domain)
  console.log(await isDomainAvailable(domain))
}

async function printItems() {
  // domains: { domain: undefined, available: false },
  const textAssets = {
    companyName: 'Gag',
    domains: "xdomain.com",
    slogan: 'Laugh out loud!',
    tagline: 'undefined',
    logoPrompt: 'A colorful and playful logo representing humor and laughter.',
    whyTheLogo: 'The company wants to convey a sense of fun and entertainment through its brand.'
  };

  for (const [key, value] of Object.entries(textAssets)) {
    console.log(`${key}: ${value}`);
  }
  
}

// getDomain()
printItems()
