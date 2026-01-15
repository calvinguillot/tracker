export const alertState = $state({
	isOpen: false,
	message: '',
	title: 'Alert',
	type: 'alert' as 'alert' | 'confirm',
	confirmText: 'Confirm',
	cancelText: 'Cancel',
	isDestructive: false,
	resolvePromise: null as ((value: boolean) => void) | null
});

export function showAlert(message: string, title: string = 'Alert') {
	alertState.message = message;
	alertState.title = title;
	alertState.type = 'alert';
	alertState.isOpen = true;
	alertState.resolvePromise = null;
}

export function showConfirm(
	message: string,
	title: string = 'Confirm',
	options: { confirmText?: string; cancelText?: string; isDestructive?: boolean } = {}
): Promise<boolean> {
	alertState.message = message;
	alertState.title = title;
	alertState.type = 'confirm';
	alertState.confirmText = options.confirmText ?? 'Confirm';
	alertState.cancelText = options.cancelText ?? 'Cancel';
	alertState.isDestructive = options.isDestructive ?? false;
	alertState.isOpen = true;

	return new Promise((resolve) => {
		alertState.resolvePromise = resolve;
	});
}

export function closeAlert(result: boolean = false) {
	alertState.isOpen = false;
	if (alertState.resolvePromise) {
		alertState.resolvePromise(result);
		alertState.resolvePromise = null;
	}
}
