import React, { useState, useRef } from 'react';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Shield, Calendar, Lock, Save, Camera, Trash2, Loader2 } from 'lucide-react';
import { formatDate } from '../lib/utils';

const Profile: React.FC = () => {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/profile', formData);
      const updatedUser = response.data.data || response.data;
      setUser(updatedUser);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.password_confirmation) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.put('/profile/password', passwordData);
      setPasswordData({ current_password: '', password: '', password_confirmation: '' });
      setIsChangingPassword(false);
      toast.success('Password changed successfully');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate on client side
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedUser = response.data.data || response.data;
      setUser(updatedUser);
      toast.success('Profile photo updated!');
    } catch (error: any) {
      if (!error.response || ![422].includes(error.response.status)) {
        toast.error('Failed to upload photo.');
      }
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Remove your profile photo?')) return;

    setUploadingAvatar(true);
    try {
      const response = await api.delete('/profile/avatar');
      const updatedUser = response.data.data || response.data;
      setUser(updatedUser);
      toast.success('Profile photo removed.');
    } catch {
      toast.error('Failed to remove photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const roleBadgeVariant = user?.role === 'admin' ? 'destructive' : user?.role === 'teacher' ? 'info' : 'success';

  return (
    <>
      <Header title="Profile" description="Manage your account settings" />
      <div className="page-container max-w-3xl mx-auto">
        {/* Profile Header with Avatar Upload */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar with upload overlay */}
              <div className="relative group">
                <Avatar name={user?.name || ''} src={user?.avatar} size="xl" previewable />

                {/* Upload overlay */}
                <div
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{user?.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{user?.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
                  <Badge variant={roleBadgeVariant} className="capitalize">
                    <Shield className="h-3 w-3 mr-1" />
                    {user?.role}
                  </Badge>
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    Joined {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                  </Badge>
                </div>

                {/* Photo action buttons */}
                <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                    Change Photo
                  </Button>
                  {user?.avatar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary-500" />
              Personal Information
            </CardTitle>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" required>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" required>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" isLoading={loading}>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={user?.name || ''} />
                <Separator />
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email || ''} />
                <Separator />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={user?.phone || 'Not set'} />
                <Separator />
                <InfoRow icon={<Shield className="h-4 w-4" />} label="Role" value={user?.role || ''} className="capitalize" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary-500" />
              Change Password
            </CardTitle>
            {!isChangingPassword && (
              <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                Change
              </Button>
            )}
          </CardHeader>
          {isChangingPassword && (
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password" required>Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password" required>New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    required
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password" required>Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.password_confirmation}
                    onChange={(e) => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" isLoading={loading}>
                    <Lock className="h-4 w-4" />
                    Update Password
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsChangingPassword(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>
      </div>
    </>
  );
};

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}> = ({ icon, label, value, className }) => (
  <div className="flex items-center gap-4">
    <div className="text-gray-400">{icon}</div>
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${className || ''}`}>{value}</p>
    </div>
  </div>
);

export default Profile;
