// app/api/workflows/route.js
import { NextResponse } from 'next/server';

// Store workflows temporarily on server side
let pendingWorkflows = [];

export async function POST(request) {
  try {
    const { workflow, originalMessage } = await request.json();
    
    console.log('🎉 Received workflow request:', originalMessage);
    console.log('📋 Workflow data:', Object.keys(workflow || {}));
    
    if (!workflow) {
      return NextResponse.json({ 
        success: false, 
        error: 'No workflow data provided' 
      }, { status: 400 });
    }

    // The workflow object comes as { "workflow-123": { ... } }
    const workflowId = Object.keys(workflow)[0];
    const workflowData = workflow[workflowId];
    
    console.log('📝 Processing workflow:', workflowId);
    
    // Store in pending workflows for the frontend to pick up
    pendingWorkflows.push({
      id: workflowId,
      data: workflowData,
      timestamp: Date.now()
    });
    
    console.log('✅ Workflow queued for frontend pickup');
    
    return NextResponse.json({ 
      success: true, 
      workflowId: workflowId,
      message: 'Workflow queued successfully' 
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// New endpoint for frontend to poll for workflows
export async function GET() {
  const workflows = [...pendingWorkflows];
  pendingWorkflows = []; // Clear the queue
  
  return NextResponse.json({ 
    workflows: workflows,
    message: workflows.length > 0 ? `Returning ${workflows.length} pending workflows` : 'No pending workflows'
  });
}