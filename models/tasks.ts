export interface Task {
	done: boolean;
	campaign: string;
	date: string | number;
}

export interface Tasks {
	phone: string;
	tasks: Task[]
}

interface PhoneTasks {
	phone: string,
	doneDate: number
}

interface CodeTask {
	phone: string,
	date: number,
}

interface Phone {
	phone: string,
	active: boolean
}

interface Code {
	name: string,
	active: boolean,
}

export interface allowedPhones {
	name: string,
	phone: string;
	credits?: number;
	sent?: boolean;
	date?: number;
}

export interface Version {
	name: string,
	description?: string,
	type?: 'jobTask' | 'jobSys',
	phone?: number,
	code?: Code,
	nxCode?: string,
	firstMessage?: string,
	prompt: string,
	stage?: string,
	done: boolean,
	doneDate?: number,
	createdDate: number,
}

// Quizá agregarle un history codes, para saber que números les han escrito.
import { ObjectId } from 'mongodb';
export interface Campaign {
	_id?: ObjectId,
	uuid?: string,
	assistantId?: string,
  email: string,
	versions: Version[]
}
