import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
// import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // Commented out - not installed

interface TutorialSlide {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  order: number;
  isActive: boolean;
  targetAudience: 'hiring' | 'applicant' | 'all';
  createdAt: string;
  updatedAt: string;
}

const SuperAdminTutorialSlides: React.FC = () => {
  const { toast } = useToast();
  const [slides, setSlides] = useState<TutorialSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState<TutorialSlide | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    isActive: true,
    targetAudience: 'hiring' as 'hiring' | 'applicant' | 'all',
  });

  // Fetch slides
  const fetchSlides = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/super-admin/slides');
      if (!response.ok) throw new Error('Failed to fetch slides');
      const data = await response.json();
      setSlides(data.sort((a: TutorialSlide, b: TutorialSlide) => a.order - b.order));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tutorial slides",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      isActive: true,
      targetAudience: 'hiring',
    });
    setSelectedSlide(null);
  };

  // Handle create slide
  const handleCreateSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/super-admin/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create slide');

      toast({
        title: "Success",
        description: "Tutorial slide created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchSlides();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tutorial slide",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update slide
  const handleUpdateSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlide) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/super-admin/slides/${selectedSlide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update slide');

      toast({
        title: "Success",
        description: "Tutorial slide updated successfully",
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchSlides();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tutorial slide",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete slide
  const handleDeleteSlide = async () => {
    if (!selectedSlide) return;

    try {
      const response = await fetch(`/api/super-admin/slides/${selectedSlide.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete slide');

      toast({
        title: "Success",
        description: "Tutorial slide deleted successfully",
      });
      setIsDeleteAlertOpen(false);
      setSelectedSlide(null);
      fetchSlides();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tutorial slide",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  // Handle move up in order
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newSlides = [...slides];
    [newSlides[index - 1], newSlides[index]] = [newSlides[index], newSlides[index - 1]];

    // Update order numbers
    const reorderedSlides = newSlides.map((slide, idx) => ({
      ...slide,
      order: idx + 1,
    }));

    setSlides(reorderedSlides);

    // Save new order to backend
    try {
      const response = await fetch('/api/super-admin/slides/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideIds: reorderedSlides.map(s => s.id) }),
      });

      if (!response.ok) throw new Error('Failed to reorder slides');
      toast({
        title: "Success",
        description: "Slides reordered successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reorder slides",
        variant: "destructive",
      });
      fetchSlides(); // Revert to original order
      console.error(error);
    }
  };

  // Handle move down in order
  const handleMoveDown = async (index: number) => {
    if (index === slides.length - 1) return;

    const newSlides = [...slides];
    [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]];

    // Update order numbers
    const reorderedSlides = newSlides.map((slide, idx) => ({
      ...slide,
      order: idx + 1,
    }));

    setSlides(reorderedSlides);

    // Save new order to backend
    try {
      const response = await fetch('/api/super-admin/slides/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideIds: reorderedSlides.map(s => s.id) }),
      });

      if (!response.ok) throw new Error('Failed to reorder slides');
      toast({
        title: "Success",
        description: "Slides reordered successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reorder slides",
        variant: "destructive",
      });
      fetchSlides(); // Revert to original order
      console.error(error);
    }
  };

  // Open edit dialog
  const openEditDialog = (slide: TutorialSlide) => {
    setSelectedSlide(slide);
    setFormData({
      title: slide.title,
      description: slide.description,
      imageUrl: slide.imageUrl || '',
      isActive: slide.isActive,
      targetAudience: slide.targetAudience,
    });
    setIsEditDialogOpen(true);
  };

  // Toggle slide active status
  const toggleSlideStatus = async (slide: TutorialSlide) => {
    try {
      const response = await fetch(`/api/super-admin/slides/${slide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !slide.isActive }),
      });

      if (!response.ok) throw new Error('Failed to update slide');

      toast({
        title: "Success",
        description: `Slide ${!slide.isActive ? 'activated' : 'deactivated'} successfully`,
      });
      fetchSlides();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update slide status",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tutorial Slides</h1>
          <p className="text-gray-600 mt-2">
            Manage tutorial slides for new user onboarding
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Slide
        </Button>
      </div>

      {/* Slides List */}
      <Card>
        <CardHeader>
          <CardTitle>All Slides</CardTitle>
        </CardHeader>
        <CardContent>
          {slides.length === 0 ? (
            <div className="text-center py-12">
              <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No slides yet</h3>
              <p className="text-gray-600 mb-4">Create your first tutorial slide to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Slide
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="flex items-center space-x-4 p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                >
                  {/* Order controls */}
                  <div className="flex flex-col space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 h-6"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === slides.length - 1}
                      className="p-1 h-6"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium">{slide.title}</h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                        {slide.targetAudience}
                      </span>
                      {slide.isActive ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    {slide.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {slide.description}
                      </p>
                    )}
                    {slide.imageUrl && (
                      <p className="text-xs text-gray-500 mt-1">
                        Has image
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={slide.isActive}
                      onCheckedChange={() => toggleSlideStatus(slide)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(slide)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSlide(slide);
                        setIsDeleteAlertOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Slide Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tutorial Slide</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSlide} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Select
                value={formData.targetAudience}
                onValueChange={(value: 'hiring' | 'applicant' | 'all') =>
                  setFormData({ ...formData, targetAudience: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hiring">Hiring App</SelectItem>
                  <SelectItem value="applicant">Applicant App</SelectItem>
                  <SelectItem value="all">All Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Slide'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Slide Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tutorial Slide</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSlide} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="edit-imageUrl">Image URL (optional)</Label>
              <Input
                id="edit-imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="edit-targetAudience">Target Audience</Label>
              <Select
                value={formData.targetAudience}
                onValueChange={(value: 'hiring' | 'applicant' | 'all') =>
                  setFormData({ ...formData, targetAudience: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hiring">Hiring App</SelectItem>
                  <SelectItem value="applicant">Applicant App</SelectItem>
                  <SelectItem value="all">All Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Slide'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tutorial Slide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSlide?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSlide} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminTutorialSlides;