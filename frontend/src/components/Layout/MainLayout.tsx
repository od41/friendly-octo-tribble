import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 min-w-[320px] max-w-[640px] mx-auto">
      <Navbar />
      <main className="container mx-auto px-4 py-6 mt-[52px]">
        <Outlet />
      </main>
      {/* @TODO: make footer navigation */}
      <Footer />
    </div>
  );
};