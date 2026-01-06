'use client';

import { useState } from 'react';

interface LoginFormProps {
	onLoggedIn?: () => void;
}

export function LoginForm({ onLoggedIn }: LoginFormProps) {
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/admin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error ?? 'Login failed');
			}
			if (onLoggedIn) {
				onLoggedIn();
			} else {
				window.location.reload();
			}
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
			<div>
				<label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
					Admin Password
				</label>
				<input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
					placeholder="Enter password"
					autoComplete="current-password"
					disabled={isLoading}
					required
				/>
			</div>
			{error ? <p className="text-sm text-red-400">{error}</p> : null}
			<button
				type="submit"
				disabled={isLoading}
				className="inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white disabled:opacity-50"
			>
				{isLoading ? 'Signing in…' : 'Sign in'}
			</button>
		</form>
	);
}


