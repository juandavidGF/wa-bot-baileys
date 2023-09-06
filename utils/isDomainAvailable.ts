import { promisify } from 'util';
const whois = require('whois')

// Convert whois.lookup into a function that returns a Promise.
const lookup = promisify(whois.lookup);

async function isDomainAvailable(domain: string): Promise<boolean> {
	console.log('isDomainAvailable: ', domain)
	try {
		const data = await lookup(domain);
		const pattern = /^No match for domain/;
		return pattern.test(data);
	} catch (err) {
		console.error('isDomainAvailable.ts', err);
		return false;
	}
}

export default isDomainAvailable;
