/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{js,jsx,ts,tsx}',
      './components/**/*.{js,jsx,ts,tsx}',
      './app/**/*.{js,jsx,ts,tsx}',
      './src/**/*.{js,jsx,ts,tsx}',
    ],
    prefix: "",
    theme: {
      container: {
        center: true,
        padding: '2rem',
        screens: {
          '2xl': '1400px'
        }
      },
      extend: {
        colors: {
          canvas: '#FDFCFB',
          'canvas-alt': '#FBFAF7',
          surface: '#FFFFFF',
          ink: '#0A0A0A',
          'ink-soft': '#1A1A1A',
          // Var #9B9080 (3,14:1 mot hvitt) og brukes kun på tekst, aldri som
          // bakgrunn — altså 43 steder med tekst under WCAG AA-grensen på 4,5:1.
          taupe: '#7A7365',
          quiet: '#7C7466',
          fill: '#F5F2EB',
          hairline: '#EBE6DF',
          lavender: '#9B5BD6',
          'lavender-soft': '#CF97FC',
          success: '#18794E',
          'success-bg': '#E8F4EE',
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          primary: {
            DEFAULT: 'hsl(var(--primary))',
            foreground: 'hsl(var(--primary-foreground))'
          },
          secondary: {
            DEFAULT: 'hsl(var(--secondary))',
            foreground: 'hsl(var(--secondary-foreground))'
          },
          destructive: {
            DEFAULT: 'hsl(var(--destructive))',
            foreground: 'hsl(var(--destructive-foreground))'
          },
          muted: {
            DEFAULT: 'hsl(var(--muted))',
            foreground: 'hsl(var(--muted-foreground))'
          },
          accent: {
            DEFAULT: 'hsl(var(--accent))',
            foreground: 'hsl(var(--accent-foreground))'
          },
          popover: {
            DEFAULT: 'hsl(var(--popover))',
            foreground: 'hsl(var(--popover-foreground))'
          },
          card: {
            DEFAULT: 'hsl(var(--card))',
            foreground: 'hsl(var(--card-foreground))'
          },
          chart: {
            '1': 'hsl(var(--chart-1))',
            '2': 'hsl(var(--chart-2))',
            '3': 'hsl(var(--chart-3))',
            '4': 'hsl(var(--chart-4))',
            '5': 'hsl(var(--chart-5))'
          },
          sidebar: {
            DEFAULT: 'hsl(var(--sidebar-background))',
            foreground: 'hsl(var(--sidebar-foreground))',
            primary: 'hsl(var(--sidebar-primary))',
            'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
            accent: 'hsl(var(--sidebar-accent))',
            'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
            border: 'hsl(var(--sidebar-border))',
            ring: 'hsl(var(--sidebar-ring))'
          }
        },
        borderRadius: {
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)',
          card: '20px',
          panel: '24px'
        },
        fontFamily: {
          heading: ['var(--font-heading)', 'sans-serif'],
          body: ['var(--font-body)', 'sans-serif'],
        },
        maxWidth: {
          shell: '1400px',
        },
        // Tailwinds standardskala for opasitet går i steg på 5. Klasser som
        // `bg-white/92` eller `border-white/12` ble derfor aldri generert — de
        // så riktige ut i koden, men ga INGEN bakgrunn/kant i nettleseren.
        // Det var årsaken til badgen med svart tekst rett på bildet. Vi åpner
        // hele skalaen 0–100 slik at feilen ikke kan oppstå igjen. JIT lager
        // bare de verdiene som faktisk brukes, så CSS-en vokser ikke.
        opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [String(i), String(i / 100)])),
        keyframes: {
          'accordion-down': {
            from: {
              height: '0'
            },
            to: {
              height: 'var(--radix-accordion-content-height)'
            }
          },
          'accordion-up': {
            from: {
              height: 'var(--radix-accordion-content-height)'
            },
            to: {
              height: '0'
            }
          }
        },
        animation: {
          'accordion-down': 'accordion-down 0.2s ease-out',
          'accordion-up': 'accordion-up 0.2s ease-out'
        }
      }
    },
    plugins: [require("tailwindcss-animate")],
  }