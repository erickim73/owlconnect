import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
    return (
        <div>
            <Button>
                <Link href="/dashboard"> go to dashboard</Link>
            </Button>
            <Button>
                <Link href="/onboarding"> go to onboarding</Link>
            </Button>
            <Button>
                <Link href="/agents"> go to agents</Link>
            </Button>
            Welcome to the Main page
        </div>
    )
}