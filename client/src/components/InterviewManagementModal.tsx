import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Video, Phone, MapPin, Edit, Plus, Trash2, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

interface Interview {
  id: string;
  candidateName: string;
  candidateEmail?: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  interviewType: string;
  meetingLink?: string;
  interviewer: string;
  status: string;
  notes?: string;
  organizationId: string;
  createdAt: string;
  updatedAt?: string;
}

interface InterviewManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InterviewManagementModal({ isOpen, onClose }: InterviewManagementModalProps) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all interviews
  const { data: interviews = [], isLoading } = useQuery<Interview[]>({
    queryKey: ['/api/interviews'],
    enabled: isOpen,
  });

  // Create/Update interview mutation
  const interviewMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingInterview) {
        return apiRequest('PATCH', `/api/interviews/${editingInterview.id}`, data);
      } else {
        return apiRequest('POST', '/api/interviews', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      setEditingInterview(null);
      setShowCreateForm(false);
      toast({
        title: "Success",
        description: editingInterview ? "Interview updated successfully" : "Interview scheduled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save interview",
        variant: "destructive",
      });
    },
  });

  // Delete interview mutation
  const deleteMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      console.log(`Attempting to delete interview with ID: ${interviewId}`);
      try {
        const result = await apiRequest('DELETE', `/api/interviews/${interviewId}`);
        console.log('Delete response:', result);
        return result;
      } catch (error) {
        console.error('Delete error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Interview deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      toast({
        title: "Success",
        description: "Interview deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error('Delete mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete interview",
        variant: "destructive",
      });
    },
  });

  // Filter interviews by status
  const now = new Date();
  const upcomingInterviews = interviews.filter(interview => {
    const interviewDateTime = new Date(`${interview.scheduledDate} ${interview.scheduledTime}`);
    return isAfter(interviewDateTime, now) && interview.status === 'scheduled';
  });

  const pastInterviews = interviews.filter(interview => {
    const interviewDateTime = new Date(`${interview.scheduledDate} ${interview.scheduledTime}`);
    return isBefore(interviewDateTime, now) || interview.status === 'completed';
  });

  const todayInterviews = interviews.filter(interview => {
    const interviewDate = startOfDay(new Date(interview.scheduledDate));
    const today = startOfDay(now);
    return interviewDate.getTime() === today.getTime();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const InterviewCard = ({ interview }: { interview: Interview }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{interview.candidateName}</CardTitle>
            <p className="text-sm text-gray-600">{interview.jobTitle}</p>
            {interview.candidateEmail && (
              <p className="text-xs text-gray-500">{interview.candidateEmail}</p>
            )}
          </div>
          <Badge className={getStatusColor(interview.status)}>
            {interview.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{interview.scheduledDate}</span>
            <Clock className="h-4 w-4 text-gray-500 ml-2" />
            <span>{interview.scheduledTime}</span>
            {interview.timeZone && (
              <span className="text-xs text-gray-400 ml-1">({interview.timeZone})</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            {interview.interviewType === 'video' ? (
              <Video className="h-4 w-4 text-gray-500" />
            ) : interview.interviewType === 'phone' ? (
              <Phone className="h-4 w-4 text-gray-500" />
            ) : (
              <MapPin className="h-4 w-4 text-gray-500" />
            )}
            <span className="capitalize">{interview.interviewType}</span>
            {interview.meetingLink && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(interview.meetingLink, '_blank')}
                className="h-6 px-2"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>

          {interview.notes && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {interview.notes}
            </div>
          )}

          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingInterview(interview)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteMutation.mutate(interview.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const InterviewForm = ({ interview }: { interview?: Interview }) => {
    const [formData, setFormData] = useState({
      candidateName: interview?.candidateName || '',
      candidateEmail: interview?.candidateEmail || '',
      candidateId: interview?.candidateId || '',
      jobId: interview?.jobId || '',
      jobTitle: interview?.jobTitle || '',
      scheduledDate: interview?.scheduledDate || '',
      scheduledTime: interview?.scheduledTime || '',
      timeZone: interview?.timeZone || 'UTC',
      interviewType: interview?.interviewType || 'video',
      meetingLink: interview?.meetingLink || '',
      notes: interview?.notes || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      interviewMutation.mutate(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="candidateName">Candidate Name *</Label>
            <Input
              id="candidateName"
              value={formData.candidateName}
              onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="candidateEmail">Candidate Email</Label>
            <Input
              id="candidateEmail"
              type="email"
              value={formData.candidateEmail}
              onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="jobTitle">Job Title *</Label>
            <Input
              id="jobTitle"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="jobId">Job ID</Label>
            <Input
              id="jobId"
              value={formData.jobId}
              onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="scheduledDate">Interview Date *</Label>
            <Input
              id="scheduledDate"
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="scheduledTime">Interview Time *</Label>
            <Input
              id="scheduledTime"
              type="time"
              value={formData.scheduledTime}
              onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="timeZone">Time Zone *</Label>
            <Select
              value={formData.timeZone}
              onValueChange={(value) => setFormData({ ...formData, timeZone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                <SelectItem value="America/Toronto">Toronto (ET)</SelectItem>
                <SelectItem value="America/Vancouver">Vancouver (PT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="interviewType">Interview Type *</Label>
            <Select
              value={formData.interviewType}
              onValueChange={(value) => setFormData({ ...formData, interviewType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video Call</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="meetingLink">Meeting Link</Label>
            <Input
              id="meetingLink"
              type="url"
              value={formData.meetingLink}
              onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              placeholder="https://zoom.us/j/..."
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Additional notes or instructions..."
          />
        </div>

        <div className="flex space-x-2">
          <Button type="submit" disabled={interviewMutation.isPending}>
            {interviewMutation.isPending ? 'Saving...' : (interview ? 'Update Interview' : 'Schedule Interview')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingInterview(null);
              setShowCreateForm(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interview Management</DialogTitle>
        </DialogHeader>

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Schedule New Interview</CardTitle>
            </CardHeader>
            <CardContent>
              <InterviewForm />
            </CardContent>
          </Card>
        )}

        {editingInterview && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Edit Interview</CardTitle>
            </CardHeader>
            <CardContent>
              <InterviewForm interview={editingInterview} />
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today ({todayInterviews.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcomingInterviews.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastInterviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading interviews...</div>
              ) : todayInterviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No interviews scheduled for today</div>
              ) : (
                todayInterviews.map(interview => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading interviews...</div>
              ) : upcomingInterviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No upcoming interviews scheduled</div>
              ) : (
                upcomingInterviews
                  .sort((a, b) => new Date(`${a.scheduledDate} ${a.scheduledTime}`).getTime() - new Date(`${b.scheduledDate} ${b.scheduledTime}`).getTime())
                  .map(interview => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading interviews...</div>
              ) : pastInterviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No past interviews found</div>
              ) : (
                pastInterviews
                  .sort((a, b) => new Date(`${b.scheduledDate} ${b.scheduledTime}`).getTime() - new Date(`${a.scheduledDate} ${a.scheduledTime}`).getTime())
                  .map(interview => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Floating Schedule New Interview button */}
        <div className="relative">
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="absolute bottom-4 right-4 z-50 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule New Interview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}