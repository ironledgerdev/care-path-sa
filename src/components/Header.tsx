import React from 'react';
import { MapPin, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { name: 'Home', path: '/' },
    { name: 'Find Doctors', path: '/search' },
    { name: 'Memberships', path: '/memberships' },
    { name: 'About Us', path: '/about' },
    { name: 'Meet the Team', path: '/team' },
  ];

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-primary/20 sticky top-0 z-50 shadow-[var(--shadow-medical)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 hover:scale-105 transition-transform duration-300 group"
          >
            <div className="medical-icon p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-medical-gradient">IronLedgerMedMap</span>
              <span className="text-xs text-muted-foreground">Find. Book. Heal.</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 hover:scale-105 ${
                  isActive(item.path)
                    ? 'text-primary bg-primary/10 shadow-sm'
                    : 'text-foreground hover:text-primary hover:bg-primary/5'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="outline" className="btn-medical-secondary">
              Doctor Portal
            </Button>
            <Button className="btn-medical-primary">
              Book Now
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-primary"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-primary/20 animate-slide-in-up">
            <nav className="flex flex-col space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-primary bg-primary/10'
                      : 'text-foreground hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col space-y-2 pt-4 border-t border-primary/20">
                <Button variant="outline" className="btn-medical-secondary w-full">
                  Doctor Portal
                </Button>
                <Button className="btn-medical-primary w-full">
                  Book Now
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;