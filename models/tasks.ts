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

export interface Version {
	name: string,
	description?: string,
	phone?: number,
	code?: Code,
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
  email: string,
	versions: Version[]
}
