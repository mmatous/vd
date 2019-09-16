export default class VdError extends Error {
	constructor(notify, ...args) {
		super(...args);
		this.notify = notify;
	}
}
