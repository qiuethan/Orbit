// src/components/layout/Header.js
'use client'

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { 
  Bars3Icon, 
  BellIcon, 
  XMarkIcon,
  CalendarDaysIcon,
  RectangleGroupIcon
} from '@heroicons/react/24/outline'

const user = {
  name: 'You',
  email: 'user@company.com',
  imageUrl: null,
}

const navigation = [
  { name: 'Workflow', href: '/', current: true },
  { name: 'Vision', href: '/vision', current: false },
  { name: 'Graph', href: '/graph', current: false },
  { name: 'Dashboard', href: '/dashboard', current: false },
]

const userNavigation = [
  { name: 'Your Profile', href: '#' },
  { name: 'Settings', href: '#' },
  { name: 'Sign out', href: '#' },
]

const viewOptions = [
  { name: 'Calendar', icon: CalendarDaysIcon, value: 'calendar' },
  { name: 'Flowchart', icon: RectangleGroupIcon, value: 'flowchart' },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Header() {
  const pathname = usePathname();
  const [currentView, setCurrentView] = useState('calendar')
  const [notifications] = useState([
    { id: 1, title: 'Workflow completed', time: '2m ago', unread: true },
    { id: 2, title: 'Approval required', time: '5m ago', unread: true },
    { id: 3, title: 'System update', time: '1h ago', unread: false },
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <Disclosure as="header" className="border-b border-gray-200 bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          
          {/* Left Section - Logo & Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <div className="flex items-center space-x-3">
                <img 
                    src="/logo.png" 
                    alt="Orbit Logo" 
                    className="h-9 w-9 rounded-lg object-contain"
                />
                <span className="text-xl font-semibold text-gray-900 hidden sm:block">
                    Orbit
                </span>
                </div>
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={classNames(
                    pathname === item.href 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="search"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-gray-300 transition-colors"
              />
            </div>
          </div>

          {/* Right Section - Actions & Profile */}
          <div className="flex items-center space-x-3">
            
            {/* View Switcher */}
            <div className="hidden lg:flex rounded-lg border border-gray-200 p-1 bg-gray-50">
              {viewOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCurrentView(option.value)}
                  className={classNames(
                    currentView === option.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                    'flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all'
                  )}
                >
                  <option.icon className="h-4 w-4 mr-2" />
                  {option.name}
                </button>
              ))}
            </div>

            {/* Notifications */}
            <Menu as="div" className="relative">
              <MenuButton className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </MenuButton>
              
              <MenuItems className="absolute right-0 mt-2 w-80 origin-top-right bg-white rounded-xl shadow-lg ring-1 ring-gray-200 border border-gray-100 z-50">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification, index) => (
                    <MenuItem key={notification.id}>
                      <div className="flex items-start p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0">
                        <div className="flex-1">
                          <p className={classNames(
                            'text-sm mb-1',
                            notification.unread ? 'font-medium text-gray-900' : 'text-gray-700'
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500">{notification.time}</p>
                        </div>
                        {notification.unread && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                        )}
                      </div>
                    </MenuItem>
                  ))}
                </div>
              </MenuItems>
            </Menu>

            {/* Profile */}
            <Menu as="div" className="relative">
              <MenuButton className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-gray-300">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">U</span>
                </div>
              </MenuButton>
              
              <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-gray-200 border border-gray-100 z-50">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="py-1">
                  {userNavigation.map((item) => (
                    <MenuItem key={item.name}>
                      <a
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {item.name}
                      </a>
                    </MenuItem>
                  ))}
                </div>
              </MenuItems>
            </Menu>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <DisclosureButton className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300">
                <Bars3Icon className="block h-6 w-6 group-data-[open]:hidden" />
                <XMarkIcon className="hidden h-6 w-6 group-data-[open]:block" />
              </DisclosureButton>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Panel */}
      <DisclosurePanel className="lg:hidden border-t border-gray-200">
        <div className="px-4 pt-2 pb-3 space-y-1">
          {/* Mobile View Switcher */}
          <div className="pb-3">
            <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
              {viewOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCurrentView(option.value)}
                  className={classNames(
                    currentView === option.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500',
                    'flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium'
                  )}
                >
                  <option.icon className="h-4 w-4 mr-2" />
                  {option.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Navigation */}
          {navigation.map((item) => (
            <DisclosureButton
              key={item.name}
              as={Link}
              href={item.href}
              className={classNames(
                pathname === item.href 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                'block px-3 py-2 rounded-md text-base font-medium'
              )}
            >
              {item.name}
            </DisclosureButton>
          ))}
        </div>

        {/* Mobile User Section */}
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="flex items-center px-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">U</span>
              </div>
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">{user.name}</div>
              <div className="text-sm font-medium text-gray-500">{user.email}</div>
            </div>
            <button className="ml-auto flex-shrink-0 p-1 text-gray-400 rounded-full hover:text-gray-600">
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
          <div className="mt-3 px-2 space-y-1">
            {userNavigation.map((item) => (
              <DisclosureButton
                key={item.name}
                as="a"
                href={item.href}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              >
                {item.name}
              </DisclosureButton>
            ))}
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  )
}