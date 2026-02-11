'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function CaptchaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [noiseLines, setNoiseLines] = useState<Array<{width: string; left: string; top: string; transform: string}>>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZqwertyuiopasdfghjklzxcvbnm123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);

    // Generate noise lines
    const lines = [...Array(10)].map(() => ({
      width: `${Math.random() * 100 + 50}px`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      transform: `rotate(${Math.random() * 180}deg)`,
    }));
    setNoiseLines(lines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.user) {
          localStorage.setItem('chat-user', JSON.stringify(data.user));
        }
        router.push('/chat');
      } else {
        if (data.redirect) {
          window.location.href = data.redirect;
        } else {
          setError('Incorrect CAPTCHA. Please try again.');
          generateCaptcha();
          setCode('');
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Static date to avoid hydration mismatch
  const lastEditDate = 'January 15, 2025';

  return (
    <div className="min-h-screen bg-white">
      {/* Wikipedia-style Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">W</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-normal text-gray-900">Wikipedia</h1>
                  <p className="text-xs text-gray-500">The Free Encyclopedia</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Wikipedia"
                  className="w-48 sm:w-64 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <aside className="hidden lg:block w-48 flex-shrink-0">
            <nav className="space-y-1">
              <div className="text-xs font-semibold text-gray-700 mb-2 px-2">NAVIGATION</div>
              <a href="#" className="block px-2 py-1 text-sm text-blue-800 hover:underline">Main page</a>
              <a href="#" className="block px-2 py-1 text-sm text-blue-800 hover:underline">Contents</a>
              <a href="#" className="block px-2 py-1 text-sm text-blue-800 hover:underline">Current events</a>
              <a href="#" className="block px-2 py-1 text-sm text-blue-800 hover:underline">Random article</a>
              <a href="#" className="block px-2 py-1 text-sm text-blue-800 hover:underline">About Wikipedia</a>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Article Header */}
            <div className="border-b border-gray-200 pb-3 mb-4">
              <h1 className="text-3xl font-serif font-normal text-gray-900 border-b-0">
                Security Verification
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                From Wikipedia, the free encyclopedia
              </p>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="text-base text-gray-800 leading-relaxed">
                <p>
                  To protect Wikipedia from automated editing abuse, we require you to verify that you are human. Please complete the security check below to continue.
                </p>
              </div>

              {/* CAPTCHA Box */}
              <Card className="border border-gray-300 bg-gray-50">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* CAPTCHA Display */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Type the characters you see in the image below
                      </label>
                      <div className="relative">
                        <div
                          className="w-full h-24 bg-gray-100 border-2 border-gray-300 rounded flex items-center justify-center overflow-hidden"
                          style={{
                            backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                          }}
                        >
                          <div className="relative z-10 flex gap-2">
                            {captchaText.split('').map((char, index) => (
                              <span
                                key={index}
                                className="text-3xl font-mono font-bold text-gray-700 select-none"
                                style={{
                                  transform: `rotate(${(Math.random() - 0.5) * 15}deg)`,
                                }}
                                suppressHydrationWarning
                              >
                                {char}
                              </span>
                            ))}
                          </div>
                          {/* Noise lines - only render after mount */}
                          {isMounted && (
                            <div className="absolute inset-0 pointer-events-none">
                              {noiseLines.map((line, index) => (
                                <div
                                  key={index}
                                  className="absolute bg-gray-300 opacity-30"
                                  style={line}
                                  suppressHydrationWarning
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 h-8 w-8 p-0 text-gray-600 hover:bg-gray-200"
                          onClick={generateCaptcha}
                          title="Get a new challenge"
                        >
                          🔄
                        </Button>
                      </div>
                    </div>

                    {/* Input */}
                    <div className="space-y-2">
                      <label htmlFor="captcha" className="text-sm font-semibold text-gray-700">
                        Enter the characters
                      </label>
                      <Input
                        id="captcha"
                        type="text"
                        placeholder="Enter the characters above"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="bg-white border-gray-400 text-gray-900 placeholder:text-gray-400"
                        maxLength={10}
                        autoComplete="off"
                        autoFocus
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                        {error}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        className="bg-gray-800 hover:bg-gray-700 text-white font-normal px-6"
                        disabled={loading || !code.trim()}
                      >
                        {loading ? 'Verifying...' : 'Verify'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-gray-400 text-gray-700 hover:bg-gray-100 font-normal"
                        onClick={() => window.location.href = 'https://www.wikipedia.org'}
                      >
                        Cancel
                      </Button>
                    </div>

                    {/* Help text */}
                    <div className="text-xs text-gray-600">
                      <p>
                        <strong>Note:</strong> This verification helps protect Wikipedia from automated abuse. Your IP address will be logged for security purposes.
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Footer info */}
              <div className="text-xs text-gray-600 border-t border-gray-200 pt-4">
                <p>
                  This page was last edited on {lastEditDate}. Wikipedia® is a registered trademark of the Wikimedia Foundation, Inc., a non-profit organization.
                </p>
              </div>
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Did you know?</h3>
              <ul className="space-y-2 text-gray-700 text-xs">
                <li>• Wikipedia contains over 6 million articles in English</li>
                <li>• It is edited by volunteers worldwide</li>
                <li>• Content is free to use and share</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Wikipedia-style Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              <strong>Privacy policy</strong> • <strong>About Wikipedia</strong> • <strong>Disclaimers</strong> • <strong>Contact Wikipedia</strong> • <strong>Code of Conduct</strong> • <strong>Developers</strong> • <strong>Statistics</strong> • <strong>Cookie statement</strong>
            </p>
            <p className="text-gray-500 mt-2">
              Text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
