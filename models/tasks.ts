export interface Task {
	done: boolean;
	campaign: string;
	date: string | number;
}

export interface Tasks {
	phone: string;
	tasks: Task[]
}

import { ObjectId } from 'mongodb';
export interface Campaign {
	_id?: ObjectId,
  email: string,
	name: string,
	description?: string,
	phone?: number,
	code?: string,
	firstMessage?: string,
	prompt: string,
	stage?: string,
	done: boolean,
	doneDate?: number,
	createdDate: number,
}
