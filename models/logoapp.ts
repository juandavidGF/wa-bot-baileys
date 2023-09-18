import { ObjectId } from 'mongodb';

export interface LogoDescription {
  Why: string;
  Prompt: string;
  [key: string]: string;
}

export interface webDomain {
	domain: string | any;
	available: boolean;
}

type textAssets = {
	product?: string | null,
  companyName: string | null,
  domain: string | undefined,
  slogan: string | null,
  tagline: string | null,
  logoPrompt: string | null,
  whyLogo: string | null
}

export interface DesighBrief {
	companyName: string | null;
	domains: webDomain[] | string | undefined;
	slogan: string | null;
	tagline: string | null;
	logoPrompt: string | null;
	whyLogo: string | null;
}

export interface Generation {
	createdDate: number;
  product: string;
  images: string[];
  designBrief: DesighBrief | string;
}

export interface UserGenModel {
	_id?: number | ObjectId;
	name?: string;
	email?: string;
	celphone?: string;
	createdDate?: number;
	generation: Generation[];
}

export interface Task {
	task: string;
	done: boolean;
}

export interface Tasks {
	phone: string;
	tasks: Task[]
}
