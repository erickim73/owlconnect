import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        // Get form data from request
        const formData = await request.formData();
        
        // Forward the request to your Python backend
        const backendResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/onboard`, {
            method: 'POST',
            body: formData, // Forward the FormData as-is
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { detail: errorText || `Backend error: ${backendResponse.status}` };
            }
            
            return NextResponse.json(
                { error: errorData.detail || errorData.error || 'Onboarding failed' }, 
                { status: backendResponse.status }
            );
        }

        const result = await backendResponse.json();
        return NextResponse.json(result);
        
    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
    }
}
