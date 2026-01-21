'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  MessageSquare,
  ClipboardCheck,
  FileText,
  CalendarDays,
  BarChart3,
  Award,
  Clock,
  Calendar,
  CreditCard,
  HeartHandshake,
  HelpCircle,
  Bot,
  MessageCircle,
  X,
  Sparkles,
  Construction,
} from 'lucide-react'
import { Button, Card, CardContent, PageLoader } from '@/components/ui'

interface Service {
  id: string
  name: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
}

const services: Service[] = [
  {
    id: 'institution',
    name: 'My Institution',
    description: 'View institution details, policies, and announcements',
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Communicate with professors and administration',
    icon: MessageSquare,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'View your attendance records and statistics',
    icon: ClipboardCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    id: 'assignments',
    name: 'Assignments',
    description: 'Submit and track your assignments',
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    id: 'exam-schedules',
    name: 'Exam Schedules',
    description: 'View upcoming exams and schedules',
    icon: CalendarDays,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Academic reports and performance analytics',
    icon: BarChart3,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'assessments',
    name: 'Assessments',
    description: 'View assessment results and grades',
    icon: Award,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    id: 'timetable',
    name: 'Timetable',
    description: 'Your class schedule and calendar',
    icon: Clock,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  {
    id: 'leave',
    name: 'Leave',
    description: 'Apply for leave and track applications',
    icon: Calendar,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Fee payments and financial records',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'counselling',
    name: 'Student Counselling',
    description: 'Book counselling sessions and support',
    icon: HeartHandshake,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  {
    id: 'quiz',
    name: 'Quiz',
    description: 'Practice quizzes and assessments',
    icon: HelpCircle,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
  },
  {
    id: 'ai-copilot',
    name: 'AI Professor Copilot',
    description: 'AI-powered learning assistant',
    icon: Bot,
    color: 'text-fuchsia-600',
    bgColor: 'bg-fuchsia-100',
  },
  {
    id: 'feedback',
    name: 'Feedback',
    description: 'Submit feedback and suggestions',
    icon: MessageCircle,
    color: 'text-sky-600',
    bgColor: 'bg-sky-100',
  },
]

export default function ServicesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  if (status === 'loading') {
    return <PageLoader />
  }

  if (!session || session.user.role !== 'student') {
    router.push('/login')
    return null
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/student/dashboard"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500">Access all Edunox features and modules</p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services.map((service) => {
          const Icon = service.icon
          return (
            <button
              key={service.id}
              onClick={() => setSelectedService(service)}
              className="group text-left"
            >
              <Card className="h-full hover:shadow-lg hover:border-primary-200 transition-all duration-200 group-hover:scale-[1.02]">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${service.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${service.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      {/* Coming Soon Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedService(null)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedService(null)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="relative mx-auto w-20 h-20">
                <div className={`w-20 h-20 ${selectedService.bgColor} rounded-2xl flex items-center justify-center`}>
                  <selectedService.icon className={`w-10 h-10 ${selectedService.color}`} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Construction className="w-4 h-4 text-amber-600" />
                </div>
              </div>

              {/* Content */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedService.name}
                </h2>
                <div className="mt-4 space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-100 to-amber-100 rounded-full">
                    <Sparkles className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-semibold text-primary-700">Coming Soon</span>
                  </div>
                  <p className="text-gray-600">
                    We are integrating this service and it will be available soon.
                  </p>
                </div>
              </div>

              {/* Features teaser */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-sm text-gray-500">
                  {selectedService.description}
                </p>
              </div>

              {/* Action */}
              <Button
                onClick={() => setSelectedService(null)}
                className="w-full"
                size="lg"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

